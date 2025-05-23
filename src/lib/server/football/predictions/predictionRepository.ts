import { db } from '../../db';
import { fixtures, predictions, leagueTable, teams } from '../../db/schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { user } from '../../db/auth/auth-schema';
import type { Prediction, LeagueTable } from '../../db/schema';
import { randomUUID } from 'crypto';

/**
 * Result interface for prediction processing
 */
interface PredictionProcessResult {
	processed: number;
	pointsAllocated: number;
	usersUpdated: number;
}

/**
 * User stats tracking for batch updates
 */
interface UserPointsUpdate {
	correctScore: number;
	correctOutcome: number;
	points: number;
}

/**
 * Calculates points for a prediction
 */
function calculatePredictionPoints(
	predictedHomeScore: number,
	predictedAwayScore: number,
	actualHomeScore: number,
	actualAwayScore: number,
	pointsMultiplier = 1
): number {
	// Perfect score: 3 points × multiplier
	if (predictedHomeScore === actualHomeScore && predictedAwayScore === actualAwayScore) {
		return 3 * pointsMultiplier;
	}

	// Correct outcome: 1 point × multiplier
	const predictedOutcome =
		predictedHomeScore > predictedAwayScore
			? 'home'
			: predictedHomeScore < predictedAwayScore
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

/**
 * Process all predictions for a specific fixture once it's finished
 * and calculate points based on the final score
 */
export async function processPredictionsForFixture(
	fixtureId: string,
	homeScore: number,
	awayScore: number
): Promise<PredictionProcessResult> {
	// Get fixture to check multiplier
	const fixture = await db
		.select({
			pointsMultiplier: fixtures.pointsMultiplier,
			status: fixtures.status
		})
		.from(fixtures)
		.where(eq(fixtures.id, fixtureId))
		.then((rows) => rows[0]);

	// Only process if fixture is finished
	if (!fixture || fixture.status !== 'FINISHED') {
		return { processed: 0, pointsAllocated: 0, usersUpdated: 0 };
	}

	// Get all predictions for this fixture
	const fixturePredictions: Prediction[] = await db
		.select()
		.from(predictions)
		.where(eq(predictions.fixtureId, fixtureId));

	if (fixturePredictions.length === 0) {
		return { processed: 0, pointsAllocated: 0, usersUpdated: 0 };
	}

	let totalPointsAllocated = 0;
	const userUpdateMap = new Map<string, UserPointsUpdate>();

	// Process each prediction
	for (const prediction of fixturePredictions) {
		// Calculate points for this prediction
		const points = calculatePredictionPoints(
			prediction.predictedHomeScore,
			prediction.predictedAwayScore,
			homeScore,
			awayScore,
			fixture.pointsMultiplier
		);

		// Update the prediction with points
		await db.update(predictions).set({ points }).where(eq(predictions.id, prediction.id));

		// Track points for user update
		if (!userUpdateMap.has(prediction.userId)) {
			userUpdateMap.set(prediction.userId, { correctScore: 0, correctOutcome: 0, points: 0 });
		}

		const userData = userUpdateMap.get(prediction.userId)!;
		userData.points += points;

		// Determine type of correct prediction
		if (points > 0) {
			const basePoints = points / fixture.pointsMultiplier;
			if (basePoints === 3) {
				userData.correctScore += 1;
			} else if (basePoints === 1) {
				userData.correctOutcome += 1;
			}
		}

		totalPointsAllocated += points;
	}

	// Update league table entries for affected users
	const affectedUsers = Array.from(userUpdateMap.keys());
	for (const userId of affectedUsers) {
		const userData = userUpdateMap.get(userId)!;

		// Get existing league table entry
		const existingEntry: LeagueTable | undefined = await db
			.select()
			.from(leagueTable)
			.where(eq(leagueTable.userId, userId))
			.then((rows) => rows[0]);

		if (existingEntry) {
			// Update existing entry
			await db
				.update(leagueTable)
				.set({
					totalPoints: existingEntry.totalPoints + userData.points,
					correctScorelines: existingEntry.correctScorelines + userData.correctScore,
					correctOutcomes: existingEntry.correctOutcomes + userData.correctOutcome,
					completedFixtures: (existingEntry.completedFixtures ?? 0) + 1,
					lastUpdated: new Date()
				})
				.where(eq(leagueTable.id, existingEntry.id));
		} else {
			// Create new entry if it doesn't exist
			await db.insert(leagueTable).values({
				id: randomUUID(),
				userId: userId,
				totalPoints: userData.points,
				correctScorelines: userData.correctScore,
				correctOutcomes: userData.correctOutcome,
				predictedFixtures: 1,
				completedFixtures: 1,
				lastUpdated: new Date()
			});
		}
	}

	return {
		processed: fixturePredictions.length,
		pointsAllocated: totalPointsAllocated,
		usersUpdated: affectedUsers.length
	};
}

/**
 * Get the current league table rankings
 */
export async function getLeagueTable() {
	try {
		// Import user schema from auth to avoid circular dependencies

		const leaderboard = await db
			.select({
				id: leagueTable.id,
				userId: leagueTable.userId,
				userName: user.name,
				userEmail: user.email,
				totalPoints: leagueTable.totalPoints,
				correctScorelines: leagueTable.correctScorelines,
				correctOutcomes: leagueTable.correctOutcomes,
				predictedFixtures: leagueTable.predictedFixtures,
				completedFixtures: leagueTable.completedFixtures,
				lastUpdated: leagueTable.lastUpdated
			})
			.from(leagueTable)
			.innerJoin(user, eq(leagueTable.userId, user.id))
			.orderBy(desc(leagueTable.totalPoints));

		return leaderboard;
	} catch (error) {
		console.error('Error getting league table:', error);
		return [];
	}
}
