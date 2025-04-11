import { db } from '../../db';
import * as schema from '../../db/schema';
import { user } from '../../db/auth/auth-schema';
import type { Prediction } from '../../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { calculatePredictionPoints, updateUserLeagueTable } from './index';

/**
 * Get all predictions for a specific user and week
 */
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

/**
 * Get all predictions for a specific fixture
 */
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

/**
 * Submit multiple predictions for a user
 */
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

			// Check if prediction is being made too late (< 30 minutes before kickoff)
			const matchDate = new Date(fixture[0].matchDate);
			const now = new Date();
			const cutoffTime = new Date(matchDate.getTime() - 30 * 60 * 1000);

			if (now >= cutoffTime) {
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

/**
 * Process predictions for a completed fixture
 */
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

/**
 * Get the league table (sorted by total points)
 */
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
			userId: schema.leagueTable.userId,
			userName: user.name,
			points: schema.leagueTable.totalPoints,
			correctScorelines: schema.leagueTable.correctScorelines,
			correctOutcomes: schema.leagueTable.correctOutcomes
		})
		.from(schema.leagueTable)
		.innerJoin(user, eq(schema.leagueTable.userId, user.id))
		.orderBy(desc(schema.leagueTable.totalPoints));

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
