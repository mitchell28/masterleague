import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { Prediction } from '$lib/server/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { leagueTable, user } from '$lib/server/db/schema';
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
		const predictions = await db
			.select()
			.from(schema.predictions)
			.where(
				and(
					eq(schema.predictions.userId, userId),
					// Use the fixtures found to filter predictions
					inArray(
						schema.predictions.fixtureId,
						fixtures.map((f) => f.id)
					)
				)
			);

		return predictions;
	} catch (error) {
		console.error(`Error getting user predictions for week ${weekId}:`, error);
		return [];
	}
}

// Get all users who have submitted predictions for a specific week
export async function getUsersWithPredictionsByWeek(weekId: number): Promise<string[]> {
	try {
		// Get fixtures for the week
		const fixtures = await db
			.select()
			.from(schema.fixtures)
			.where(eq(schema.fixtures.weekId, weekId));

		if (fixtures.length === 0) {
			return [];
		}

		// Get unique user IDs who have predictions for these fixtures
		const predictions = await db
			.select({ userId: schema.predictions.userId })
			.from(schema.predictions)
			.where(
				inArray(
					schema.predictions.fixtureId,
					fixtures.map((f) => f.id)
				)
			);

		// Extract unique user IDs
		const userIds = [...new Set(predictions.map((p) => p.userId))];
		return userIds;
	} catch (error) {
		console.error(`Error getting users with predictions for week ${weekId}:`, error);
		return [];
	}
}

// Submit predictions for a user
export async function submitPredictions(
	userId: string,
	predictionData: Array<{
		fixtureId: string;
		homeScore: number;
		awayScore: number;
	}>
): Promise<Prediction[]> {
	// Validate user exists
	const userExists = await db.select().from(schema.user).where(eq(schema.user.id, userId));

	if (userExists.length === 0) {
		throw new Error('User not found');
	}

	const now = new Date();
	const results: Prediction[] = [];

	// Process predictions individually
	try {
		for (const prediction of predictionData) {
			// Check if fixture exists and is still scheduled
			const fixture = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, prediction.fixtureId));

			if (fixture.length === 0) {
				throw new Error(`Fixture ${prediction.fixtureId} not found`);
			}

			// Check if fixture is in the future and still predictable
			if (fixture[0].status !== 'upcoming') {
				throw new Error(`This match is no longer open for predictions`);
			}

			// Check if prediction already exists
			const existingPrediction = await db
				.select()
				.from(schema.predictions)
				.where(
					and(
						eq(schema.predictions.userId, userId),
						eq(schema.predictions.fixtureId, prediction.fixtureId)
					)
				);

			let result;

			if (existingPrediction.length === 0) {
				// Create new prediction
				result = await db
					.insert(schema.predictions)
					.values({
						id: randomUUID(),
						userId,
						fixtureId: prediction.fixtureId,
						predictedHomeScore: prediction.homeScore,
						predictedAwayScore: prediction.awayScore,
						createdAt: now,
						points: 0 // Default to 0 points until processed
					})
					.returning();
			} else {
				// Update existing prediction
				result = await db
					.update(schema.predictions)
					.set({
						predictedHomeScore: prediction.homeScore,
						predictedAwayScore: prediction.awayScore
					})
					.where(eq(schema.predictions.id, existingPrediction[0].id))
					.returning();
			}

			if (result && result.length > 0) {
				results.push(result[0]);
			}
		}

		return results;
	} catch (error) {
		console.error('Error submitting predictions:', error);
		throw error;
	}
}

// Calculate points for a prediction
export function calculatePoints(
	prediction: {
		predictedHomeScore: number;
		predictedAwayScore: number;
	},
	result: {
		homeScore: number;
		awayScore: number;
	},
	multiplier: number = 1
): number {
	// If scores match exactly: 3 points
	const isExactScore =
		prediction.predictedHomeScore === result.homeScore &&
		prediction.predictedAwayScore === result.awayScore;

	if (isExactScore) {
		return 3 * multiplier;
	}

	// If outcome matches (win/loss/draw): 1 point
	const predictedOutcome = getOutcome(prediction.predictedHomeScore, prediction.predictedAwayScore);
	const actualOutcome = getOutcome(result.homeScore, result.awayScore);

	if (predictedOutcome === actualOutcome) {
		return 1 * multiplier;
	}

	// No points
	return 0;
}

// Helper function to determine match outcome
function getOutcome(homeScore: number, awayScore: number): 'home' | 'away' | 'draw' {
	if (homeScore > awayScore) {
		return 'home';
	} else if (homeScore < awayScore) {
		return 'away';
	} else {
		return 'draw';
	}
}

// Process results for a fixture
export async function processFixtureResults(fixtureId: string): Promise<void> {
	try {
		// Get the fixture
		const fixture = await db
			.select()
			.from(schema.fixtures)
			.where(eq(schema.fixtures.id, fixtureId));

		if (fixture.length === 0) {
			throw new Error(`Fixture ${fixtureId} not found`);
		}

		// Check if fixture has results
		if (
			fixture[0].status !== 'completed' ||
			fixture[0].homeScore === null ||
			fixture[0].awayScore === null
		) {
			throw new Error(`Fixture ${fixtureId} does not have complete results`);
		}

		// Get all predictions for this fixture
		const predictions = await db
			.select()
			.from(schema.predictions)
			.where(eq(schema.predictions.fixtureId, fixtureId));

		// Process each prediction
		for (const prediction of predictions) {
			const points = calculatePoints(
				{
					predictedHomeScore: prediction.predictedHomeScore,
					predictedAwayScore: prediction.predictedAwayScore
				},
				{
					homeScore: fixture[0].homeScore!,
					awayScore: fixture[0].awayScore!
				},
				fixture[0].pointsMultiplier
			);

			// Check if prediction was correct
			const isCorrectScoreline =
				prediction.predictedHomeScore === fixture[0].homeScore &&
				prediction.predictedAwayScore === fixture[0].awayScore;

			const predictedOutcome = getOutcome(
				prediction.predictedHomeScore,
				prediction.predictedAwayScore
			);
			const actualOutcome = getOutcome(fixture[0].homeScore!, fixture[0].awayScore!);
			const isCorrectOutcome = predictedOutcome === actualOutcome;

			// Update prediction with points earned
			await db
				.update(schema.predictions)
				.set({
					points: points
				})
				.where(eq(schema.predictions.id, prediction.id));

			// Update league table
			await updateLeagueTable(prediction.userId, points, isCorrectScoreline, isCorrectOutcome);
		}

		// Update fixture status if needed
		await db
			.update(schema.fixtures)
			.set({
				status: 'completed'
			})
			.where(eq(schema.fixtures.id, fixtureId));
	} catch (error) {
		console.error(`Error processing results for fixture ${fixtureId}:`, error);
		throw error;
	}
}

// Update the league table for a user
async function updateLeagueTable(
	userId: string,
	pointsEarned: number,
	isCorrectScoreline: boolean,
	isCorrectOutcome: boolean
): Promise<void> {
	const now = new Date();

	// Check if user already has an entry in the league table
	const existingEntry = await db.select().from(leagueTable).where(eq(leagueTable.userId, userId));

	if (existingEntry.length === 0) {
		// Create new entry
		await db.insert(leagueTable).values({
			id: randomUUID(),
			userId,
			totalPoints: pointsEarned,
			correctScorelines: isCorrectScoreline ? 1 : 0,
			correctOutcomes: isCorrectOutcome && !isCorrectScoreline ? 1 : 0,
			lastUpdated: now
		});
	} else {
		// Update existing entry
		await db
			.update(leagueTable)
			.set({
				totalPoints: existingEntry[0].totalPoints + pointsEarned,
				correctScorelines: existingEntry[0].correctScorelines + (isCorrectScoreline ? 1 : 0),
				correctOutcomes:
					existingEntry[0].correctOutcomes + (isCorrectOutcome && !isCorrectScoreline ? 1 : 0),
				lastUpdated: now
			})
			.where(eq(leagueTable.id, existingEntry[0].id));
	}
}

// Get the current league table
export async function getLeagueTable(): Promise<
	Array<{
		userId: string;
		username: string;
		totalPoints: number;
		correctScorelines: number;
		correctOutcomes: number;
	}>
> {
	return db
		.select({
			userId: leagueTable.userId,
			username: user.username,
			totalPoints: leagueTable.totalPoints,
			correctScorelines: leagueTable.correctScorelines,
			correctOutcomes: leagueTable.correctOutcomes
		})
		.from(leagueTable)
		.innerJoin(user, eq(leagueTable.userId, user.id))
		.orderBy(desc(leagueTable.totalPoints));
}
