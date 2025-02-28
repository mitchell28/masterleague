import type { Prediction, Fixture } from '../db/schema';
import { predictions, fixtures, leagueTable, user } from '../db/schema';
import { db } from '../db';
import { eq, and, asc, desc, or, inArray as drizzleInArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Get predictions for a specific user and week
export async function getUserPredictionsByWeek(
	userId: string,
	weekId: number
): Promise<Prediction[]> {
	const weekFixtures = await db.select().from(fixtures).where(eq(fixtures.weekId, weekId));
	const fixtureIds = weekFixtures.map((fixture) => fixture.id);

	if (fixtureIds.length === 0) {
		return [];
	}

	return db
		.select()
		.from(predictions)
		.where(and(eq(predictions.userId, userId), drizzleInArray(predictions.fixtureId, fixtureIds)));
}

// Get all users who have made predictions for a specific week
export async function getUsersWithPredictionsByWeek(weekId: number): Promise<string[]> {
	const weekFixtures = await db.select().from(fixtures).where(eq(fixtures.weekId, weekId));
	const fixtureIds = weekFixtures.map((fixture) => fixture.id);

	if (fixtureIds.length === 0) {
		return [];
	}

	const predictionRecords = await db
		.select({ userId: predictions.userId })
		.from(predictions)
		.where(drizzleInArray(predictions.fixtureId, fixtureIds))
		.groupBy(predictions.userId);

	return predictionRecords.map((record) => record.userId);
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
	if (predictionData.length === 0) {
		return [];
	}

	// Get week ID for the first fixture
	const fixtureResult = await db
		.select({ weekId: fixtures.weekId })
		.from(fixtures)
		.where(eq(fixtures.id, predictionData[0].fixtureId))
		.limit(1);

	if (fixtureResult.length === 0) {
		throw new Error('Fixture not found');
	}

	const weekId = fixtureResult[0].weekId;

	// Check if user has already submitted predictions for this week
	const weekFixtures = await db.select().from(fixtures).where(eq(fixtures.weekId, weekId));
	const fixtureIds = weekFixtures.map((fixture) => fixture.id);

	const existingPredictions = await db
		.select()
		.from(predictions)
		.where(and(eq(predictions.userId, userId), drizzleInArray(predictions.fixtureId, fixtureIds)));

	// If user has already submitted predictions for this week, delete them
	if (existingPredictions.length > 0) {
		await db
			.delete(predictions)
			.where(
				and(eq(predictions.userId, userId), drizzleInArray(predictions.fixtureId, fixtureIds))
			);
	}

	// Insert all predictions
	const now = new Date();
	const predictionEntities = predictionData.map((prediction) => ({
		id: randomUUID(),
		userId,
		fixtureId: prediction.fixtureId,
		predictedHomeScore: prediction.homeScore,
		predictedAwayScore: prediction.awayScore,
		points: 0, // Points will be calculated when results are in
		createdAt: now
	}));

	await db.insert(predictions).values(predictionEntities);

	// Return the newly created predictions
	return db
		.select()
		.from(predictions)
		.where(and(eq(predictions.userId, userId), drizzleInArray(predictions.fixtureId, fixtureIds)));
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
	// Check for correct scoreline (3 points)
	if (
		prediction.predictedHomeScore === result.homeScore &&
		prediction.predictedAwayScore === result.awayScore
	) {
		return 3 * multiplier;
	}

	// Check for correct outcome (1 point)
	const predictedOutcome = getOutcome(prediction.predictedHomeScore, prediction.predictedAwayScore);
	const actualOutcome = getOutcome(result.homeScore, result.awayScore);

	if (predictedOutcome === actualOutcome) {
		return 1 * multiplier;
	}

	// No points
	return 0;
}

// Determine the outcome of a match (home win, away win, draw)
function getOutcome(homeScore: number, awayScore: number): 'home' | 'away' | 'draw' {
	if (homeScore > awayScore) {
		return 'home';
	} else if (homeScore < awayScore) {
		return 'away';
	} else {
		return 'draw';
	}
}

// Process results for a fixture and update user points
export async function processFixtureResults(fixtureId: string): Promise<void> {
	// Get fixture details
	const fixtureResult = await db.select().from(fixtures).where(eq(fixtures.id, fixtureId)).limit(1);
	if (fixtureResult.length === 0 || fixtureResult[0].status !== 'completed') {
		throw new Error('Fixture not found or not completed');
	}

	const fixture = fixtureResult[0];
	if (fixture.homeScore === null || fixture.awayScore === null) {
		throw new Error('Fixture results not available');
	}

	// Get all predictions for this fixture
	const fixturesPredictions = await db
		.select()
		.from(predictions)
		.where(eq(predictions.fixtureId, fixtureId));

	// Calculate points and update each prediction
	for (const prediction of fixturesPredictions) {
		// Use the fixture's pointsMultiplier directly
		const multiplier = fixture.pointsMultiplier;

		// Calculate points
		const points = calculatePoints(
			{
				predictedHomeScore: prediction.predictedHomeScore,
				predictedAwayScore: prediction.predictedAwayScore
			},
			{
				homeScore: fixture.homeScore,
				awayScore: fixture.awayScore
			},
			multiplier
		);

		// Update prediction with points
		await db.update(predictions).set({ points }).where(eq(predictions.id, prediction.id));

		// Update league table
		await updateLeagueTable(
			prediction.userId,
			points,
			prediction.predictedHomeScore === fixture.homeScore &&
				prediction.predictedAwayScore === fixture.awayScore,
			getOutcome(prediction.predictedHomeScore, prediction.predictedAwayScore) ===
				getOutcome(fixture.homeScore, fixture.awayScore)
		);
	}
}

// Update league table for a user
async function updateLeagueTable(
	userId: string,
	pointsEarned: number,
	isCorrectScoreline: boolean,
	isCorrectOutcome: boolean
): Promise<void> {
	// Check if user already has an entry in the league table
	const existingEntry = await db.select().from(leagueTable).where(eq(leagueTable.userId, userId));

	const now = new Date();

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
