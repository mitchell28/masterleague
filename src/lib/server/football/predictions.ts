import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { Prediction } from '$lib/server/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { leagueTable, user } from '$lib/server/db';
import { randomUUID } from 'crypto';

// Get a user's predictions for a specific week
export async function getUserPredictionsByWeek(
	userId: string,
	weekId: number
): Promise<Prediction[]> {
	try {
		// Get fixtures for the week
		const fixtures = await db
			.select()
			.from(schema.fixtures)
			.where(eq(schema.fixtures.weekId, weekId));

		// Get predictions for these fixtures
		if (fixtures.length === 0) {
			return [];
		}

		const fixtureIds = fixtures.map((f) => f.id);

		const predictions = await db
			.select()
			.from(schema.predictions)
			.where(
				and(
					eq(schema.predictions.userId, userId),
					inArray(schema.predictions.fixtureId, fixtureIds)
				)
			);

		return predictions;
	} catch (error) {
		console.error('Failed to get user predictions:', error);
		throw error;
	}
}

// Get all predictions for a single fixture
export async function getPredictionsForFixture(fixtureId: string): Promise<Prediction[]> {
	try {
		const predictions = await db
			.select()
			.from(schema.predictions)
			.where(eq(schema.predictions.fixtureId, fixtureId));

		return predictions;
	} catch (error) {
		console.error('Failed to get fixture predictions:', error);
		throw error;
	}
}

// Implement proper bulk prediction submission
export async function submitPrediction(
	userId: string,
	predictionsData: Array<{
		fixtureId: string;
		homeScore: number;
		awayScore: number;
	}>
): Promise<Prediction[]> {
	try {
		// Validate user exists
		const userExists = await db.select().from(user).where(eq(user.id, userId));

		if (userExists.length === 0) {
			throw new Error('User not found');
		}

		const results: Prediction[] = [];
		let newPredictionsCount = 0;

		// Process each prediction
		for (const predictionData of predictionsData) {
			const { fixtureId, homeScore, awayScore } = predictionData;

			// Validate fixture exists and is upcoming
			const fixture = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixtureId));

			if (fixture.length === 0) {
				console.warn(`Fixture ${fixtureId} not found, skipping prediction`);
				continue;
			}

			// Only allow predictions for fixtures that are SCHEDULED or TIMED
			const isUpcoming = ['SCHEDULED', 'TIMED'].includes(fixture[0].status);
			if (!isUpcoming) {
				console.warn(
					`Fixture ${fixtureId} is not upcoming (status: ${fixture[0].status}), skipping prediction`
				);
				continue;
			}

			// Check if prediction is being made too late (< 1 hour before kickoff)
			const matchDate = new Date(fixture[0].matchDate);
			const now = new Date();
			const oneHourBeforeMatch = new Date(matchDate.getTime() - 60 * 60 * 1000);

			if (now >= oneHourBeforeMatch) {
				console.warn(`Prediction for fixture ${fixtureId} rejected - cutoff time has passed`);
				throw new Error(`The cutoff time has passed for match ${fixture[0].id}`);
			}

			// Check if user already has a prediction for this fixture
			const existingPrediction = await db
				.select()
				.from(schema.predictions)
				.where(
					and(eq(schema.predictions.userId, userId), eq(schema.predictions.fixtureId, fixtureId))
				);

			let result: Prediction;

			// If prediction exists, update it
			if (existingPrediction.length > 0) {
				const updatedPrediction = await db
					.update(schema.predictions)
					.set({
						predictedHomeScore: homeScore,
						predictedAwayScore: awayScore,
						createdAt: new Date()
					})
					.where(eq(schema.predictions.id, existingPrediction[0].id))
					.returning();

				result = updatedPrediction[0];
			} else {
				// Otherwise, create a new prediction
				const newPrediction = await db
					.insert(schema.predictions)
					.values({
						id: randomUUID(),
						userId,
						fixtureId,
						predictedHomeScore: homeScore,
						predictedAwayScore: awayScore,
						createdAt: new Date()
					})
					.returning();

				result = newPrediction[0];
				newPredictionsCount++;
			}

			results.push(result);
		}

		// Update the user's predictedFixtures count if there are new predictions
		if (newPredictionsCount > 0) {
			// Get the user's current league table entry
			const userLeagueEntry = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.userId, userId));

			if (userLeagueEntry.length > 0) {
				// Increment the predictedFixtures count
				await db
					.update(schema.leagueTable)
					.set({
						predictedFixtures: (userLeagueEntry[0].predictedFixtures || 0) + newPredictionsCount
					})
					.where(eq(schema.leagueTable.id, userLeagueEntry[0].id));
			} else {
				// Create a new entry if one doesn't exist
				await db.insert(schema.leagueTable).values({
					id: randomUUID(),
					userId,
					totalPoints: 0,
					correctScorelines: 0,
					correctOutcomes: 0,
					predictedFixtures: newPredictionsCount,
					completedFixtures: 0,
					lastUpdated: new Date()
				});
			}
		}

		return results;
	} catch (error) {
		console.error('Failed to submit predictions:', error);
		throw error;
	}
}

// Calculate points for a user's prediction
export function calculatePredictionPoints(
	prediction: Prediction,
	actualHomeScore: number,
	actualAwayScore: number,
	pointsMultiplier = 1
): number {
	// Perfect score: 3 points × multiplier
	if (
		prediction.predictedHomeScore === actualHomeScore &&
		prediction.predictedAwayScore === actualAwayScore
	) {
		return 3 * pointsMultiplier;
	}

	// Correct outcome: 1 point × multiplier
	const predictedOutcome =
		prediction.predictedHomeScore > prediction.predictedAwayScore
			? 'home'
			: prediction.predictedHomeScore < prediction.predictedAwayScore
				? 'away'
				: 'draw';

	const actualOutcome =
		actualHomeScore > actualAwayScore
			? 'home'
			: actualHomeScore < actualAwayScore
				? 'away'
				: 'draw';

	if (predictedOutcome === actualOutcome) {
		return 1 * pointsMultiplier;
	}

	// Incorrect: 0 points
	return 0;
}

// Process predictions for a completed fixture
export async function processPredictionsForFixture(
	fixtureId: string,
	homeScore: number,
	awayScore: number
): Promise<void> {
	try {
		// Get the fixture to check status and get the points multiplier
		const fixture = await db
			.select()
			.from(schema.fixtures)
			.where(eq(schema.fixtures.id, fixtureId));

		if (fixture.length === 0) {
			throw new Error('Fixture not found');
		}

		// Only process if fixture is marked as FINISHED
		if (fixture[0].status !== 'FINISHED') {
			throw new Error('Cannot process predictions for non-completed fixture');
		}

		const pointsMultiplier = fixture[0].pointsMultiplier || 1;

		// Get all predictions for this fixture
		const predictions = await db
			.select()
			.from(schema.predictions)
			.where(eq(schema.predictions.fixtureId, fixtureId));

		// Process each prediction
		for (const prediction of predictions) {
			// Calculate points
			const points = calculatePredictionPoints(prediction, homeScore, awayScore, pointsMultiplier);

			// Update the prediction with points
			await db
				.update(schema.predictions)
				.set({
					points
				})
				.where(eq(schema.predictions.id, prediction.id));

			// Update user's league table
			await updateUserLeagueTable(
				prediction.userId,
				points > 0,
				points === 3 * pointsMultiplier,
				points
			);
		}

		// Check if the fixture's home and away scores need to be updated
		if (fixture[0].homeScore !== homeScore || fixture[0].awayScore !== awayScore) {
			// Update the fixture with the final score
			await db
				.update(schema.fixtures)
				.set({
					homeScore,
					awayScore,
					status: 'FINISHED',
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixtureId));
		}
	} catch (error) {
		console.error('Failed to process predictions for fixture:', error);
		throw error;
	}
}

// Get the league table (sorted by total points)
export async function getLeagueTable(): Promise<
	Array<{
		userId: string;
		userName: string;
		points: number;
		correctScorelines: number;
		correctOutcomes: number;
		predictedFixtures: number;
		completedFixtures: number;
		rank: number;
	}>
> {
	// First get the base leaderboard data
	const leaderboardData = await db
		.select({
			userId: leagueTable.userId,
			userName: user.name,
			points: leagueTable.totalPoints,
			correctScorelines: leagueTable.correctScorelines,
			correctOutcomes: leagueTable.correctOutcomes
		})
		.from(leagueTable)
		.innerJoin(user, eq(leagueTable.userId, user.id))
		.orderBy(desc(leagueTable.totalPoints));

	// For each user, count their predictions and completed fixtures
	const enrichedLeaderboard = await Promise.all(
		leaderboardData.map(async (entry, index) => {
			// Get all predictions for this user
			const predictions = await db
				.select()
				.from(schema.predictions)
				.where(eq(schema.predictions.userId, entry.userId));

			// Get all fixtures to check which ones are completed
			const fixtureIds = predictions.map((p) => p.fixtureId);

			// If no predictions, return 0 for both counts
			if (fixtureIds.length === 0) {
				return {
					...entry,
					predictedFixtures: 0,
					completedFixtures: 0,
					rank: index + 1 // Add rank based on position in the sorted array
				};
			}

			// Count completed fixtures that this user predicted
			const completedFixtures = await db
				.select()
				.from(schema.fixtures)
				.where(
					and(inArray(schema.fixtures.id, fixtureIds), eq(schema.fixtures.status, 'FINISHED'))
				);

			return {
				...entry,
				predictedFixtures: predictions.length,
				completedFixtures: completedFixtures.length,
				rank: index + 1 // Add rank based on position in the sorted array
			};
		})
	);

	return enrichedLeaderboard;
}

/**
 * Update a user's league table entry
 */
async function updateUserLeagueTable(
	userId: string,
	isCorrect: boolean,
	isPerfectScore: boolean,
	points: number
): Promise<void> {
	try {
		// Get the user's current league table entry
		const userData = await db
			.select()
			.from(schema.leagueTable)
			.where(eq(schema.leagueTable.userId, userId));

		// User exists in league table, update their stats
		if (userData.length > 0) {
			await db
				.update(schema.leagueTable)
				.set({
					totalPoints: userData[0].totalPoints + points,
					correctScorelines: userData[0].correctScorelines + (isPerfectScore ? 1 : 0),
					correctOutcomes: userData[0].correctOutcomes + (isCorrect && !isPerfectScore ? 1 : 0),
					completedFixtures: (userData[0].completedFixtures || 0) + 1,
					lastUpdated: new Date()
				})
				.where(eq(schema.leagueTable.userId, userId));
		} else {
			// User doesn't exist in league table, create a new entry
			await db.insert(schema.leagueTable).values({
				id: randomUUID(),
				userId: userId,
				totalPoints: points,
				correctScorelines: isPerfectScore ? 1 : 0,
				correctOutcomes: isCorrect && !isPerfectScore ? 1 : 0,
				predictedFixtures: 1,
				completedFixtures: 1,
				lastUpdated: new Date()
			});
		}
	} catch (error) {
		console.error(`Failed to update league table for user ${userId}:`, error);
	}
}

/**
 * Efficiently check and update fixtures that need attention, including:
 * - Live fixtures
 * - Recently completed fixtures
 * - Upcoming fixtures about to start
 * - Potentially missed fixtures that might have been overlooked
 *
 * This function ensures no fixtures are missed in points calculations.
 */
// Track last update time to limit frequent calls
let lastUpdateTimestamp = 0;
const UPDATE_COOLDOWN = 2 * 60 * 1000; // 2 minute cooldown between updates
let lastLiveUpdateTimestamp = 0;
const LIVE_UPDATE_COOLDOWN = 30 * 1000; // 30 second cooldown for live matches

export async function checkAndUpdateRecentFixtures(forceCheck = false): Promise<{
	updated: number;
	live: number;
	recentlyCompleted: number;
	potentiallyMissed: number;
}> {
	try {
		// Check if we're within the cooldown period
		const now = new Date();
		const currentTime = now.getTime();

		// If not forced and an update was performed recently, perform a quicker check for live matches only
		if (!forceCheck && currentTime - lastUpdateTimestamp < UPDATE_COOLDOWN) {
			// For live matches, use a shorter cooldown
			if (currentTime - lastLiveUpdateTimestamp < LIVE_UPDATE_COOLDOWN) {
				console.log(
					`Skipping all updates - last live update was ${(currentTime - lastLiveUpdateTimestamp) / 1000} seconds ago`
				);
				return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
			}

			console.log(`Checking only live matches - bypassing main cooldown`);

			// Only check live matches more frequently
			const liveFixtures = await db
				.select()
				.from(schema.fixtures)
				.where(inArray(schema.fixtures.status, ['IN_PLAY', 'PAUSED']));

			if (liveFixtures.length === 0) {
				return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
			}

			// Update timestamp for live updates
			lastLiveUpdateTimestamp = currentTime;

			// Import the function to avoid circular dependency
			const { updateFixtureStatuses } = await import('./fixtures');

			// Only update live fixtures
			const liveFixtureIds = liveFixtures.map((fixture) => fixture.id);
			const result = await updateFixtureStatuses(liveFixtureIds);

			return {
				...result,
				recentlyCompleted: 0,
				potentiallyMissed: 0
			};
		}

		// Update timestamps before processing complete update
		lastUpdateTimestamp = currentTime;
		lastLiveUpdateTimestamp = currentTime;

		const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const twoHoursAhead = new Date(now.getTime() + 2 * 60 * 60 * 1000);
		const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

		// Find fixtures that need attention - use separate queries and post-filtering

		// Live fixtures - highest priority
		const liveFixtures = await db
			.select()
			.from(schema.fixtures)
			.where(inArray(schema.fixtures.status, ['IN_PLAY', 'PAUSED']));

		// Recently completed fixtures
		const finishedFixtures = await db
			.select()
			.from(schema.fixtures)
			.where(eq(schema.fixtures.status, 'FINISHED'));

		// Filter for recently completed (in last 24 hours)
		const recentlyCompletedFixtures = finishedFixtures.filter(
			(fixture) => fixture.lastUpdated && new Date(fixture.lastUpdated) >= oneDayAgo
		);

		// Filter for potentially missed fixtures (missing timestamps or scores)
		const potentiallyMissedFixtures = finishedFixtures.filter((fixture) => {
			// No lastUpdated timestamp
			if (!fixture.lastUpdated) return true;

			// Updated more than a day ago but within 3 days and missing scores
			if (
				new Date(fixture.lastUpdated) < oneDayAgo &&
				new Date(fixture.matchDate) > threeDaysAgo &&
				(fixture.homeScore === null || fixture.awayScore === null)
			) {
				return true;
			}

			return false;
		});

		// Upcoming fixtures
		const scheduledFixtures = await db
			.select()
			.from(schema.fixtures)
			.where(inArray(schema.fixtures.status, ['TIMED', 'SCHEDULED']));

		// Filter for fixtures about to start
		const upcomingFixtures = scheduledFixtures.filter(
			(fixture) => new Date(fixture.matchDate) <= twoHoursAhead
		);

		// Special statuses that need monitoring
		const specialStatusFixtures = await db
			.select()
			.from(schema.fixtures)
			.where(inArray(schema.fixtures.status, ['SUSPENDED', 'POSTPONED']));

		// Filter for recent special status fixtures
		const recentSpecialFixtures = specialStatusFixtures.filter(
			(fixture) => new Date(fixture.matchDate) >= threeDaysAgo
		);

		// Combine all fixtures that need attention
		const allFixturesToUpdate = [
			...liveFixtures,
			...recentlyCompletedFixtures,
			...potentiallyMissedFixtures,
			...upcomingFixtures,
			...recentSpecialFixtures
		];

		// If no fixtures need attention, return early
		if (allFixturesToUpdate.length === 0) {
			return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
		}

		// Remove duplicates using Set and fixture IDs
		const uniqueFixtureIds = [...new Set(allFixturesToUpdate.map((fixture) => fixture.id))];

		// Import the function to avoid circular dependency
		const { updateFixtureStatuses } = await import('./fixtures');

		// Use the updateFixtureStatuses function to do the actual updates
		const result = await updateFixtureStatuses(uniqueFixtureIds);

		return {
			...result,
			recentlyCompleted: recentlyCompletedFixtures.length,
			potentiallyMissed: potentiallyMissedFixtures.length
		};
	} catch (error) {
		console.error('Error in checkAndUpdateRecentFixtures:', error);
		return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
	}
}
