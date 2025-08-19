import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { fixtures, predictions, leagueTable } from '$lib/server/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { calculatePredictionPoints } from '$lib/server/engine/shared/utils.js';
import { randomUUID } from 'crypto';

interface RecalculationResult {
	success: boolean;
	predictionsRecalculated: number;
	predictionsVoided: number;
	usersAffected: number;
	leaderboardsUpdated: number;
	executionTime: number;
	message: string;
}

/**
 * POST /api/recalculate-points
 *
 * Public API endpoint for recalculating all user points from scratch.
 *
 * This properly handles:
 * - Finished fixtures with valid scores (calculate points normally)
 * - Finished fixtures with NULL scores (void predictions - no points)
 * - Unfinished fixtures (leave predictions unscored)
 *
 * Use this endpoint when you suspect prediction scores are incorrect
 * due to scoring issues or null score handling problems.
 */
export async function POST() {
	const startTime = Date.now();

	try {
		console.log('🔄 Starting points recalculation...');

		// Step 1: Reset all prediction points to null
		await db.update(predictions).set({ points: null });
		console.log('✅ Reset all prediction points to null');

		// Step 2: Reset all league table entries
		await db.delete(leagueTable);
		console.log('✅ Cleared all league table entries');

		// Step 3: Get all finished fixtures with their predictions
		const finishedFixtures = await db
			.select({
				id: fixtures.id,
				homeScore: fixtures.homeScore,
				awayScore: fixtures.awayScore,
				pointsMultiplier: fixtures.pointsMultiplier,
				status: fixtures.status
			})
			.from(fixtures)
			.where(eq(fixtures.status, 'FINISHED'));

		console.log(`📊 Found ${finishedFixtures.length} finished fixtures`);

		let predictionsRecalculated = 0;
		let predictionsVoided = 0;
		const userStatsMap = new Map<
			string,
			Map<
				string,
				{
					totalPoints: number;
					correctScorelines: number;
					correctOutcomes: number;
					completedFixtures: number;
				}
			>
		>();

		// Step 4: Process each finished fixture
		for (const fixture of finishedFixtures) {
			// Get all predictions for this fixture
			const fixturePredictions = await db
				.select()
				.from(predictions)
				.where(eq(predictions.fixtureId, fixture.id));

			// Check if fixture has valid scores
			if (fixture.homeScore === null || fixture.awayScore === null) {
				// Void these predictions (leave points as null)
				predictionsVoided += fixturePredictions.length;
				console.log(
					`❌ Voided ${fixturePredictions.length} predictions for fixture ${fixture.id} (NULL scores)`
				);
				continue;
			}

			// Calculate points for each prediction
			for (const prediction of fixturePredictions) {
				const points = calculatePredictionPoints(
					prediction.predictedHomeScore,
					prediction.predictedAwayScore,
					fixture.homeScore,
					fixture.awayScore,
					fixture.pointsMultiplier
				);

				// Update prediction with calculated points
				await db.update(predictions).set({ points }).where(eq(predictions.id, prediction.id));

				predictionsRecalculated++;

				// Track user stats by organization
				const orgKey = prediction.organizationId;
				const userKey = prediction.userId;

				if (!userStatsMap.has(orgKey)) {
					userStatsMap.set(orgKey, new Map());
				}

				const orgMap = userStatsMap.get(orgKey)!;
				if (!orgMap.has(userKey)) {
					orgMap.set(userKey, {
						totalPoints: 0,
						correctScorelines: 0,
						correctOutcomes: 0,
						completedFixtures: 0
					});
				}

				const userStats = orgMap.get(userKey)!;
				userStats.totalPoints += points;
				userStats.completedFixtures += 1;

				// Track prediction accuracy
				if (points > 0) {
					const basePoints = points / fixture.pointsMultiplier;
					if (basePoints === 3) {
						userStats.correctScorelines += 1;
					} else if (basePoints === 1) {
						userStats.correctOutcomes += 1;
					}
				}
			}
		}

		// Step 5: Rebuild league table entries
		let leaderboardsUpdated = 0;
		let usersAffected = 0;

		for (const [organizationId, orgUsers] of userStatsMap) {
			for (const [userId, stats] of orgUsers) {
				await db.insert(leagueTable).values({
					id: randomUUID(),
					userId,
					organizationId,
					season: '2025-26',
					totalPoints: stats.totalPoints,
					correctScorelines: stats.correctScorelines,
					correctOutcomes: stats.correctOutcomes,
					completedFixtures: stats.completedFixtures,
					lastUpdated: new Date()
				});

				usersAffected++;
			}
			leaderboardsUpdated++;
		}

		const executionTime = Date.now() - startTime;

		console.log(`🎉 Recalculation complete:
			- ${predictionsRecalculated} predictions recalculated
			- ${predictionsVoided} predictions voided (NULL scores)
			- ${usersAffected} users affected
			- ${leaderboardsUpdated} leaderboards updated
			- Execution time: ${executionTime}ms`);

		return json({
			success: true,
			predictionsRecalculated,
			predictionsVoided,
			usersAffected,
			leaderboardsUpdated,
			executionTime,
			message: `✅ Successfully recalculated ${predictionsRecalculated} predictions and voided ${predictionsVoided} predictions with NULL scores. ${usersAffected} users across ${leaderboardsUpdated} organizations updated.`
		} as RecalculationResult);
	} catch (error) {
		console.error('❌ Points recalculation failed:', error);

		return json(
			{
				success: false,
				predictionsRecalculated: 0,
				predictionsVoided: 0,
				usersAffected: 0,
				leaderboardsUpdated: 0,
				executionTime: Date.now() - startTime,
				message: `❌ Recalculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			} as RecalculationResult,
			{ status: 500 }
		);
	}
}
