import type { Prediction } from '../../db/schema';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Calculate points for a user's prediction
 */
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
	const predictedOutcome = determineMatchOutcome(
		prediction.predictedHomeScore,
		prediction.predictedAwayScore
	);
	const actualOutcome = determineMatchOutcome(actualHomeScore, actualAwayScore);

	if (predictedOutcome === actualOutcome) {
		return 1 * pointsMultiplier;
	}

	// Incorrect: 0 points
	return 0;
}

/**
 * Determine match outcome based on scores (home win, away win, or draw)
 */
export function determineMatchOutcome(
	homeScore: number,
	awayScore: number
): 'home' | 'away' | 'draw' {
	if (homeScore > awayScore) return 'home';
	if (homeScore < awayScore) return 'away';
	return 'draw';
}

/**
 * Update a user's league table entry
 */
export async function updateUserLeagueTable(
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
