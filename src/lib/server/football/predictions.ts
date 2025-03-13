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

// Submit a prediction for a fixture
export async function submitPrediction(
	userId: string,
	fixtureId: string,
	homeScore: number,
	awayScore: number
): Promise<Prediction> {
	try {
		// Validate user exists
		const userExists = await db.select().from(user).where(eq(user.id, userId));

		if (userExists.length === 0) {
			throw new Error('User not found');
		}

		// Validate fixture exists and is upcoming
		const fixture = await db
			.select()
			.from(schema.fixtures)
			.where(eq(schema.fixtures.id, fixtureId));

		if (fixture.length === 0) {
			throw new Error('Fixture not found');
		}

		if (fixture[0].status !== 'upcoming') {
			throw new Error('Cannot submit prediction for non-upcoming fixture');
		}

		// Check if user already has a prediction for this fixture
		const existingPrediction = await db
			.select()
			.from(schema.predictions)
			.where(
				and(eq(schema.predictions.userId, userId), eq(schema.predictions.fixtureId, fixtureId))
			);

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

			return updatedPrediction[0];
		}

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

		return newPrediction[0];
	} catch (error) {
		console.error('Failed to submit prediction:', error);
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

		// Only process if fixture is marked as completed
		if (fixture[0].status !== 'completed') {
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

			// Update prediction with points
			await db
				.update(schema.predictions)
				.set({ points })
				.where(eq(schema.predictions.id, prediction.id));

			// Update user stats in league table
			const userData = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.userId, prediction.userId));

			// Determine what to update
			const isPerfectScore =
				prediction.predictedHomeScore === homeScore && prediction.predictedAwayScore === awayScore;

			const isCorrectOutcome =
				(prediction.predictedHomeScore > prediction.predictedAwayScore && homeScore > awayScore) ||
				(prediction.predictedHomeScore < prediction.predictedAwayScore && homeScore < awayScore) ||
				(prediction.predictedHomeScore === prediction.predictedAwayScore &&
					homeScore === awayScore);

			// User exists in league table, update their stats
			if (userData.length > 0) {
				await db
					.update(schema.leagueTable)
					.set({
						totalPoints: userData[0].totalPoints + points,
						correctScorelines: userData[0].correctScorelines + (isPerfectScore ? 1 : 0),
						correctOutcomes: userData[0].correctOutcomes + (isCorrectOutcome ? 1 : 0),
						lastUpdated: new Date()
					})
					.where(eq(schema.leagueTable.userId, prediction.userId));
			} else {
				// User doesn't exist in league table, create a new entry
				await db.insert(schema.leagueTable).values({
					id: randomUUID(),
					userId: prediction.userId,
					totalPoints: points,
					correctScorelines: isPerfectScore ? 1 : 0,
					correctOutcomes: isCorrectOutcome ? 1 : 0,
					lastUpdated: new Date()
				});
			}
		}
	} catch (error) {
		console.error('Failed to process predictions:', error);
		throw error;
	}
}

// Get the league table (sorted by total points)
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
			username: user.name, // Changed from user.username to user.name
			totalPoints: leagueTable.totalPoints,
			correctScorelines: leagueTable.correctScorelines,
			correctOutcomes: leagueTable.correctOutcomes
		})
		.from(leagueTable)
		.innerJoin(user, eq(leagueTable.userId, user.id))
		.orderBy(desc(leagueTable.totalPoints));
}

// Either export an existing function
export function submitPredictions(/* params */) {
	// Implementation code
}
