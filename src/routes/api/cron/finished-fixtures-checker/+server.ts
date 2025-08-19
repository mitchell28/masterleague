import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { fixtures } from '$lib/server/db/schema.js';
import { cache, CacheKeys, CacheHelpers } from '$lib/server/cache/simple-cache.js';
import { eq, and, isNull, or, inArray, gt, lt, gte } from 'drizzle-orm';
import { updatePredictions, recalculateAllLeaderboards } from '$lib/server/engine/shared/index.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/cron/finished-fixtures-checker
 * Smart checker for finished fixtures that don't have scores yet
 * Only checks fixtures that finished in the last 6 hours and are missing scores
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { force, debug } = await request.json().catch(() => ({}));

		// Check if we ran recently (10 minutes default) - unless forced
		if (!force && CacheHelpers.cronRanRecently('finished-fixtures-checker', 10)) {
			const lastRunMinutesAgo = cache.getAge(CacheKeys.cronJob('finished-fixtures-checker'));
			return json({
				success: true,
				message: 'Finished fixtures check ran recently, skipping',
				last_run_minutes_ago: lastRunMinutesAgo
			});
		}

		// Get API key from environment
		const apiKey = process.env.FOOTBALL_DATA_API_KEY;
		if (!apiKey) {
			throw new Error('FOOTBALL_DATA_API_KEY environment variable is required');
		}

		console.log('🏁 Starting finished fixtures check...');
		const startTime = Date.now();

		// Smart date range - check ALL fixtures in debug mode, recent only in normal mode
		const now = new Date();
		const hoursBack = debug ? null : 6; // null = ALL in debug mode, 6 hours normally
		const timeAgo = hoursBack ? new Date(now.getTime() - hoursBack * 60 * 60 * 1000) : null;

		if (debug) {
			console.log(`🔍 Debug mode: checking ALL finished fixtures (no time limit)`);

			// First, let's see ALL finished fixtures regardless of time or scores
			const allFinished = await db
				.select()
				.from(fixtures)
				.where(eq(fixtures.status, 'FINISHED'))
				.orderBy(fixtures.matchDate);

			console.log(`🔍 Found ${allFinished.length} total finished fixtures:`);
			allFinished.forEach((f) => {
				const homeScore = f.homeScore !== null ? f.homeScore : 'NULL';
				const awayScore = f.awayScore !== null ? f.awayScore : 'NULL';
				console.log(
					`  - ID ${f.id}: ${homeScore}-${awayScore} (${f.matchDate}) [${f.homeTeamId} vs ${f.awayTeamId}]`
				);
			});

			// Also show specifically ones with NULL scores
			const nullScores = allFinished.filter((f) => f.homeScore === null || f.awayScore === null);
			console.log(`🚨 Found ${nullScores.length} finished fixtures with NULL scores:`);
			nullScores.forEach((f) => {
				const homeScore = f.homeScore !== null ? f.homeScore : 'NULL';
				const awayScore = f.awayScore !== null ? f.awayScore : 'NULL';
				console.log(`  - ID ${f.id}: ${homeScore}-${awayScore} (${f.matchDate})`);
			});
		} else {
			console.log(
				`📅 Normal mode: checking fixtures from ${timeAgo?.toISOString()} to ${now.toISOString()}`
			);
		}

		// Find FINISHED fixtures without scores
		// In debug mode: check ALL finished fixtures
		// In normal mode: only check recent finishes
		const whereConditions = [
			eq(fixtures.status, 'FINISHED'),
			or(
				isNull(fixtures.homeScore), // Missing home score
				isNull(fixtures.awayScore) // Missing away score
			)
		];

		// Only add time filter in normal mode
		if (!debug && timeAgo) {
			whereConditions.push(gt(fixtures.matchDate, timeAgo));
		}

		const finishedWithoutScores = await db
			.select()
			.from(fixtures)
			.where(and(...whereConditions))
			.limit(debug ? 100 : 20); // Higher limit in debug mode

		if (finishedWithoutScores.length === 0) {
			const timeMsg = debug ? 'ever' : `in last ${hoursBack} hours`;
			console.log(`✅ No finished fixtures missing scores ${timeMsg}`);
			CacheHelpers.markCronCompleted('finished-fixtures-checker');
			return json({
				success: true,
				checked: 0,
				updated: 0,
				message: 'No finished fixtures missing scores',
				execution_time: Date.now() - startTime
			});
		}

		console.log(`📋 Found ${finishedWithoutScores.length} finished fixtures missing scores`);

		// Log details about what we found
		finishedWithoutScores.forEach((fixture) => {
			const homeScore = fixture.homeScore;
			const awayScore = fixture.awayScore;
			console.log(
				`🔍 Fixture ${fixture.id}: home=${homeScore}, away=${awayScore}, status=${fixture.status}`
			);
		});

		// Get matchIds for API call
		const matchIds = finishedWithoutScores.map((f) => f.matchId).filter(Boolean);

		if (matchIds.length === 0) {
			console.log('❌ No valid matchIds found');
			return json({
				success: false,
				error: 'No valid matchIds for finished fixtures'
			});
		}

		// Batch API call with all matchIds (up to 20)
		const matchIdsParam = matchIds.join(',');
		console.log(`🔄 Checking ${matchIds.length} finished fixtures for scores`);

		const MATCHES_API_URL = `https://api.football-data.org/v4/matches?ids=${matchIdsParam}`;
		const response = await fetch(MATCHES_API_URL, {
			headers: {
				'X-Auth-Token': apiKey
			}
		});

		if (!response.ok) {
			if (response.status === 429) {
				console.warn('⚠️ Rate limited - will retry later');
				return json(
					{
						success: false,
						error: 'Rate limited',
						retry_after: 300 // 5 minutes
					},
					{ status: 429 }
				);
			}
			throw new Error(`API request failed with status ${response.status}`);
		}

		const data = await response.json();
		const apiMatches = data.matches || [];

		let updatedCount = 0;
		const updates: any[] = [];

		// Update fixtures with scores from API
		for (const apiMatch of apiMatches) {
			const dbFixture = finishedWithoutScores.find((f) => f.matchId === apiMatch.id.toString());
			if (!dbFixture) {
				console.log(`⚠️ API match ${apiMatch.id} not found in our database fixtures`);
				continue;
			}

			console.log(`🔄 Processing API match ${apiMatch.id}, status: ${apiMatch.status}`);

			// Only update if API has scores and fixture is marked as FINISHED
			if (
				apiMatch.status === 'FINISHED' &&
				apiMatch.score?.fullTime?.home !== null &&
				apiMatch.score?.fullTime?.away !== null
			) {
				// Check if scores are actually missing or different
				const currentHomeScore = dbFixture.homeScore;
				const currentAwayScore = dbFixture.awayScore;
				const newHomeScore = apiMatch.score.fullTime.home;
				const newAwayScore = apiMatch.score.fullTime.away;

				if (currentHomeScore !== newHomeScore || currentAwayScore !== newAwayScore) {
					await db
						.update(fixtures)
						.set({
							homeScore: newHomeScore,
							awayScore: newAwayScore,
							status: apiMatch.status,
							lastUpdated: new Date()
						})
						.where(eq(fixtures.id, dbFixture.id));

					updatedCount++;
					updates.push({
						fixture_id: dbFixture.id,
						match_id: apiMatch.id,
						old_score: `${currentHomeScore || 'null'}-${currentAwayScore || 'null'}`,
						new_score: `${newHomeScore}-${newAwayScore}`
					});

					console.log(
						`✅ Updated fixture ${dbFixture.id}: ${currentHomeScore || 'null'}-${currentAwayScore || 'null'} → ${newHomeScore}-${newAwayScore}`
					);
				} else {
					console.log(
						`ℹ️ Fixture ${dbFixture.id} already has correct scores: ${newHomeScore}-${newAwayScore}`
					);
				}
			} else {
				console.log(
					`⚠️ API match ${apiMatch.id} status: ${apiMatch.status}, scores: ${apiMatch.score?.fullTime?.home || 'null'}-${apiMatch.score?.fullTime?.away || 'null'}`
				);
			}
		}

		// Mark job as completed
		CacheHelpers.markCronCompleted('finished-fixtures-checker');

		// If we updated any fixtures, trigger smart prediction and leaderboard updates
		let leaderboardResult = null;
		let predictionResult = null;

		if (updatedCount > 0) {
			console.log(`📊 ${updatedCount} fixtures updated, checking if predictions need updates...`);

			try {
				// Update predictions for the affected fixtures - this will only process if changes are needed
				predictionResult = await updatePredictions();

				if (predictionResult.predictionsProcessed > 0) {
					console.log(
						`✅ Predictions updated: ${predictionResult.predictionsProcessed} predictions processed, ${predictionResult.usersAffected || 0} users affected`
					);

					// Smart check: Only recalculate leaderboards if predictions actually changed points
					if (predictionResult.pointsAwarded && predictionResult.pointsAwarded > 0) {
						leaderboardResult = await recalculateAllLeaderboards('2025-26', false);
						console.log(
							`✅ Leaderboards recalculated: ${leaderboardResult.length} leaderboards updated (${predictionResult.pointsAwarded} points awarded)`
						);

						// Mark leaderboards as completed too
						CacheHelpers.markCronCompleted('leaderboards');
					} else {
						console.log(
							`📊 Predictions processed but no points awarded - leaderboard recalculation skipped`
						);
					}
				} else {
					console.log(
						`📊 No predictions needed updating - all affected predictions already current`
					);
				}
			} catch (updateError) {
				console.error('⚠️ Failed to update predictions/leaderboards:', updateError);
				// Don't fail the main job, just log the error
			}
		} else {
			console.log(`📊 No fixtures updated - skipping prediction and leaderboard updates`);
		}

		const executionTime = Date.now() - startTime;
		console.log(
			`🏁 Finished fixtures check completed: ${finishedWithoutScores.length} checked, ${updatedCount} updated in ${executionTime}ms`
		);

		return json({
			success: true,
			checked: finishedWithoutScores.length,
			updated: updatedCount,
			updates,
			execution_time: executionTime,
			message: `Checked ${finishedWithoutScores.length} finished fixtures, updated ${updatedCount} with scores`,
			// Include smart prediction and leaderboard update results
			prediction_update: predictionResult
				? {
						predictions_processed: predictionResult.predictionsProcessed,
						users_affected: predictionResult.usersAffected || 0,
						points_awarded: predictionResult.pointsAwarded || 0,
						had_changes: predictionResult.predictionsProcessed > 0
					}
				: { had_changes: false, reason: 'no_fixtures_updated' },
			leaderboard_update: leaderboardResult
				? {
						leaderboards_updated: leaderboardResult.length,
						reason: 'points_awarded'
					}
				: predictionResult && predictionResult.predictionsProcessed > 0
					? {
							leaderboards_updated: 0,
							reason: 'no_points_awarded'
						}
					: {
							leaderboards_updated: 0,
							reason: 'no_predictions_updated'
						}
		});
	} catch (error) {
		console.error('❌ Finished fixtures check failed:', error);

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};
