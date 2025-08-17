import { db } from '../db/index.js';
import { fixtures, predictions, leagueTable } from '../db/schema.js';
import { eq, and, isNull, inArray, isNotNull, sql } from 'drizzle-orm';
import { recalculateLeaderboard } from './leaderboard.js';
import { calculatePredictionPoints } from './utils.js';
import { randomUUID } from 'crypto';

/**
 * Prediction update result interface
 */
export interface PredictionUpdateResult {
	success: boolean;
	predictionsProcessed: number;
	fixturesProcessed: number;
	pointsAwarded: number;
	usersAffected: number;
	leaderboardsUpdated: string[];
	executionTime: number;
	message: string;
}

/**
 * User stats tracking for batch updates
 */
interface UserStatsUpdate {
	organizationId: string;
	correctScore: number;
	correctOutcome: number;
	points: number;
}

/**
 * Update predictions for finished fixtures that don't have points calculated yet
 * Moved from background folder - this is a core football prediction processing function
 */
export async function updatePredictions(
	targetOrganizationId?: string,
	targetSeason: string = '2025-26'
): Promise<PredictionUpdateResult> {
	const startTime = Date.now();

	try {
		console.log('🏈 Starting prediction updates...');

		// Find finished fixtures that haven't been processed yet
		const finishedFixtures = await db
			.select()
			.from(fixtures)
			.where(
				and(
					isNotNull(fixtures.homeScore),
					isNotNull(fixtures.awayScore),
					eq(fixtures.season, targetSeason),
					eq(fixtures.status, 'FINISHED')
				)
			);

		if (finishedFixtures.length === 0) {
			return {
				success: true,
				predictionsProcessed: 0,
				fixturesProcessed: 0,
				pointsAwarded: 0,
				usersAffected: 0,
				leaderboardsUpdated: [],
				executionTime: Date.now() - startTime,
				message: 'No new finished fixtures to process'
			};
		}

		console.log(`📊 Found ${finishedFixtures.length} finished fixtures to process`);

		let predictionsProcessed = 0;
		let pointsAwarded = 0;
		const affectedUsers = new Set<string>();
		const affectedOrganizations = new Set<string>();

		// Process each finished fixture
		for (const fixture of finishedFixtures) {
			console.log(`Processing fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}`);

			// Get all predictions for this fixture
			const fixturePredictions = await db
				.select()
				.from(predictions)
				.where(eq(predictions.fixtureId, fixture.id));

			console.log(`Found ${fixturePredictions.length} predictions for this fixture`);

			const batchPredictionUpdates: Array<{
				id: string;
				points: number;
				isCorrectScore: boolean;
				isCorrectOutcome: boolean;
			}> = [];

			// Calculate points for each prediction
			for (const prediction of fixturePredictions) {
				const points = calculatePredictionPoints(
					prediction.homeScore,
					prediction.awayScore,
					fixture.homeScore!,
					fixture.awayScore!,
					fixture.pointsMultiplier || 1
				);

				const isCorrectScore =
					prediction.homeScore === fixture.homeScore && prediction.awayScore === fixture.awayScore;

				const predictedOutcome =
					prediction.homeScore > prediction.awayScore
						? 'home'
						: prediction.homeScore < prediction.awayScore
							? 'away'
							: 'draw';

				const actualOutcome =
					fixture.homeScore! > fixture.awayScore!
						? 'home'
						: fixture.homeScore! < fixture.awayScore!
							? 'away'
							: 'draw';

				const isCorrectOutcome = predictedOutcome === actualOutcome;

				batchPredictionUpdates.push({
					id: prediction.id,
					points,
					isCorrectScore,
					isCorrectOutcome
				});

				if (points > 0) {
					pointsAwarded += points;
					affectedUsers.add(prediction.userId);
				}

				predictionsProcessed++;
			}

			// Batch update predictions
			for (const update of batchPredictionUpdates) {
				await db
					.update(predictions)
					.set({
						points: update.points,
						isCorrectScore: update.isCorrectScore,
						isCorrectOutcome: update.isCorrectOutcome,
						lastUpdated: new Date()
					})
					.where(eq(predictions.id, update.id));
			}

			// Mark fixture as processed by setting points
			await db
				.update(fixtures)
				.set({
					points: true, // Mark as processed
					lastUpdated: new Date()
				})
				.where(eq(fixtures.id, fixture.id));

			// Track affected organizations
			affectedOrganizations.add(fixture.organizationId);

			console.log(
				`✅ Processed ${batchPredictionUpdates.length} predictions for fixture ${fixture.id}`
			);
		}

		// Trigger leaderboard recalculation for affected organizations
		const leaderboardsUpdated: string[] = [];
		for (const organizationId of affectedOrganizations) {
			try {
				console.log(`🏆 Recalculating leaderboard for organization: ${organizationId}`);
				const result = await recalculateLeaderboard(organizationId, targetSeason, false);

				if (result.success) {
					leaderboardsUpdated.push(organizationId);
					console.log(`✅ Leaderboard updated for organization: ${organizationId}`);
				} else {
					console.log(`⚠️ Failed to update leaderboard for organization: ${organizationId}`);
				}
			} catch (error) {
				console.error(`Error updating leaderboard for organization ${organizationId}:`, error);
			}
		}

		const executionTime = Date.now() - startTime;
		const message = `Updated ${predictionsProcessed} predictions across ${finishedFixtures.length} fixtures. Points awarded: ${pointsAwarded}. Users affected: ${affectedUsers.size}. Execution time: ${executionTime}ms`;

		console.log(`🎉 ${message}`);

		return {
			success: true,
			predictionsProcessed,
			fixturesProcessed: finishedFixtures.length,
			pointsAwarded,
			usersAffected: affectedUsers.size,
			leaderboardsUpdated,
			executionTime,
			message
		};
	} catch (error) {
		console.error('❌ Error updating predictions:', error);

		return {
			success: false,
			predictionsProcessed: 0,
			fixturesProcessed: 0,
			pointsAwarded: 0,
			usersAffected: 0,
			leaderboardsUpdated: [],
			executionTime: Date.now() - startTime,
			message: `Failed to update predictions: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}

/**
 * Comprehensive prediction analysis for completed fixtures
 * Provides detailed breakdown of prediction accuracy and point distribution
 */
export async function analyzePredictions(
	organizationId: string,
	season: string = '2025-26',
	gameWeek?: number
): Promise<{
	success: boolean;
	totalPredictions: number;
	correctScorelines: number;
	correctOutcomes: number;
	totalPointsAwarded: number;
	averagePointsPerPrediction: number;
	topPredictors: Array<{
		userId: string;
		userName: string;
		totalPoints: number;
		predictions: number;
		accuracy: number;
	}>;
	executionTime: number;
}> {
	const startTime = Date.now();

	try {
		// Build query conditions
		const whereConditions = [
			eq(fixtures.organizationId, organizationId),
			eq(fixtures.season, season),
			isNull(fixtures.homeScore) === false,
			isNull(fixtures.awayScore) === false
		];

		if (gameWeek) {
			whereConditions.push(eq(fixtures.gameWeek, gameWeek));
		}

		// Get all finished fixtures with predictions
		const fixturesWithPredictions = await db
			.select({
				fixture: fixtures,
				prediction: predictions
			})
			.from(predictions)
			.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
			.where(and(...whereConditions));

		// Calculate statistics
		let totalPredictions = 0;
		let correctScorelines = 0;
		let correctOutcomes = 0;
		let totalPointsAwarded = 0;

		const userStats = new Map<
			string,
			{
				totalPoints: number;
				predictions: number;
				correctScores: number;
				correctOutcomes: number;
			}
		>();

		for (const { fixture, prediction } of fixturesWithPredictions) {
			totalPredictions++;

			const points = calculatePredictionPoints(
				prediction.homeScore,
				prediction.awayScore,
				fixture.homeScore!,
				fixture.awayScore!,
				fixture.pointsMultiplier || 1
			);

			totalPointsAwarded += points;

			const isCorrectScore =
				prediction.homeScore === fixture.homeScore && prediction.awayScore === fixture.awayScore;
			const isCorrectOutcome = points > 0;

			if (isCorrectScore) correctScorelines++;
			if (isCorrectOutcome) correctOutcomes++;

			// Track user stats
			if (!userStats.has(prediction.userId)) {
				userStats.set(prediction.userId, {
					totalPoints: 0,
					predictions: 0,
					correctScores: 0,
					correctOutcomes: 0
				});
			}

			const userStat = userStats.get(prediction.userId)!;
			userStat.totalPoints += points;
			userStat.predictions++;
			if (isCorrectScore) userStat.correctScores++;
			if (isCorrectOutcome) userStat.correctOutcomes++;
		}

		// Get user names and create top predictors list
		const topPredictors = [];
		if (userStats.size > 0) {
			const userIds = Array.from(userStats.keys());
			const users = await db
				.select({
					id: predictions.userId,
					name: sql<string>`COALESCE(auth_user.name, 'Anonymous')`
				})
				.from(predictions)
				.innerJoin(sql`auth_user`, sql`predictions.user_id = auth_user.id`)
				.where(inArray(predictions.userId, userIds))
				.groupBy(predictions.userId, sql`auth_user.name`);

			for (const user of users) {
				const stats = userStats.get(user.id);
				if (stats && stats.predictions > 0) {
					topPredictors.push({
						userId: user.id,
						userName: user.name,
						totalPoints: stats.totalPoints,
						predictions: stats.predictions,
						accuracy: (stats.correctOutcomes / stats.predictions) * 100
					});
				}
			}

			// Sort by total points descending
			topPredictors.sort((a, b) => b.totalPoints - a.totalPoints);
		}

		return {
			success: true,
			totalPredictions,
			correctScorelines,
			correctOutcomes,
			totalPointsAwarded,
			averagePointsPerPrediction: totalPredictions > 0 ? totalPointsAwarded / totalPredictions : 0,
			topPredictors: topPredictors.slice(0, 10), // Top 10
			executionTime: Date.now() - startTime
		};
	} catch (error) {
		console.error('Error analyzing predictions:', error);
		return {
			success: false,
			totalPredictions: 0,
			correctScorelines: 0,
			correctOutcomes: 0,
			totalPointsAwarded: 0,
			averagePointsPerPrediction: 0,
			topPredictors: [],
			executionTime: Date.now() - startTime
		};
	}
}
