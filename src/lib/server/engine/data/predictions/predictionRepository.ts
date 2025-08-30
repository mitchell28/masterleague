import { db } from '../../../db/index.js';
import {
	fixtures,
	predictions,
	leagueTable,
	type Fixture,
	type Prediction,
	type LeagueTable
} from '../../../db/schema.js';
import { eq, and, desc, inArray, isNull, sql } from 'drizzle-orm';
import { calculatePredictionPoints } from '../../shared/utils.js';
import { user } from '../../../db/auth/auth-schema.js';
import { randomUUID } from 'crypto';
// Import background functions for automatic leaderboard updates
import { recalculateLeaderboard } from '../../analytics/leaderboard.js';

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
 * Process all predictions for a specific fixture once it's finished
 * and calculate points based on the final score
 * NOTE: Only processes predictions if the fixture has valid scores
 */
export async function processPredictionsForFixture(
	fixtureId: string,
	homeScore: number | null,
	awayScore: number | null
): Promise<PredictionProcessResult> {
	// Validate that scores are not null - if they are, don't process predictions
	if (homeScore === null || awayScore === null) {
		console.log(`Skipping prediction processing for fixture ${fixtureId} - NULL scores detected`);
		return { processed: 0, pointsAllocated: 0, usersUpdated: 0 };
	}

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

	// Update league table entries for affected users, grouped by organization
	const affectedUsers = Array.from(userUpdateMap.keys());
	const affectedOrganizations = new Set<string>();

	for (const userId of affectedUsers) {
		const userData = userUpdateMap.get(userId)!;

		// Get the user's organization for this prediction (we need to get it from one of their predictions)
		const userPrediction = fixturePredictions.find((p) => p.userId === userId);
		if (!userPrediction?.organizationId) {
			console.warn(`No organization found for user ${userId} in fixture ${fixtureId}`);
			continue;
		}

		affectedOrganizations.add(userPrediction.organizationId);

		// Get existing league table entry for this user and organization
		const existingEntry: LeagueTable | undefined = await db
			.select()
			.from(leagueTable)
			.where(
				and(
					eq(leagueTable.userId, userId),
					eq(leagueTable.organizationId, userPrediction.organizationId)
				)
			)
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
				organizationId: userPrediction.organizationId,
				season: '2025-26', // TODO: Make this dynamic based on fixture season
				totalPoints: userData.points,
				correctScorelines: userData.correctScore,
				correctOutcomes: userData.correctOutcome,
				predictedFixtures: 1,
				completedFixtures: 1,
				lastUpdated: new Date()
			});
		}
	}

	// Trigger leaderboard recalculation for affected organizations
	// This runs in the background and doesn't block the response
	for (const organizationId of affectedOrganizations) {
		// Run asynchronously to avoid blocking
		recalculateLeaderboard(organizationId, '2025-26').catch((error) => {
			console.error(
				`Failed to recalculate leaderboard for organization ${organizationId} after fixture ${fixtureId}:`,
				error
			);
		});
	}

	return {
		processed: fixturePredictions.length,
		pointsAllocated: totalPointsAllocated,
		usersUpdated: affectedUsers.length
	};
}

/**
 * Get the current league table rankings for a specific organization
 */
export async function getLeagueTable(organizationId?: string) {
	try {
		const query = db
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

		// Add organization filter if provided
		const leaderboard = organizationId
			? await query.where(eq(leagueTable.organizationId, organizationId))
			: await query;

		return leaderboard;
	} catch (error) {
		console.error('Error getting league table:', error);
		return [];
	}
}
