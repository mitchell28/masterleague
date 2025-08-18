import { json } from '@sveltejs/kit';
import { cache, CacheKeys, CacheHelpers } from '$lib/server/cache/simple-cache.js';
import { updatePredictions, recalculateAllLeaderboards } from '$lib/server/engine/shared/index.js';
import {
	updatePredictionsRealtime,
	checkLiveFixtures
} from '$lib/server/engine/analytics/predictions-realtime-simple.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/cron/intelligent-processor
 * Smart processing that only works when needed
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { job = 'auto', force = false } = await request.json();

		const results: any[] = [];

		switch (job) {
			case 'auto':
			case 'predictions': {
				// Check if prediction update ran recently (default 10 minutes)
				if (!force && CacheHelpers.cronRanRecently('predictions', 10)) {
					results.push({
						job: 'predictions',
						skipped: true,
						reason: 'Ran recently',
						last_run: cache.getAge(CacheKeys.cronJob('predictions'))
					});
					break;
				}

				// Run prediction updates
				console.log('🔄 Running prediction updates...');
				const predictionResult = await updatePredictions();

				// Mark as completed
				CacheHelpers.markCronCompleted('predictions');

				// If predictions were updated, trigger leaderboard recalculation
				if (predictionResult.predictionsProcessed > 0) {
					console.log(
						`📊 ${predictionResult.predictionsProcessed} predictions updated, triggering leaderboard recalculation...`
					);

					const leaderboardResults = await recalculateAllLeaderboards('2025-26', false);
					CacheHelpers.markCronCompleted('leaderboards');

					results.push({
						job: 'predictions',
						predictions: predictionResult,
						leaderboards: leaderboardResults,
						message: `Updated ${predictionResult.predictionsProcessed} predictions, recalculated ${leaderboardResults.length} leaderboards`
					});
				} else {
					results.push({
						job: 'predictions',
						predictions: predictionResult,
						message: 'No predictions needed updating'
					});
				}

				// If job is just 'predictions', break here
				if (job === 'predictions') break;
			}

			case 'leaderboards': {
				// Check if leaderboard update ran recently (default 15 minutes)
				if (!force && CacheHelpers.cronRanRecently('leaderboards', 15)) {
					results.push({
						job: 'leaderboards',
						skipped: true,
						reason: 'Ran recently',
						last_run: cache.getAge(CacheKeys.cronJob('leaderboards'))
					});
					break;
				}

				// Run leaderboard recalculation
				console.log('📊 Running leaderboard recalculation...');
				const leaderboardResults = await recalculateAllLeaderboards('2025-26', false);

				// Mark as completed
				CacheHelpers.markCronCompleted('leaderboards');

				results.push({
					job: 'leaderboards',
					leaderboards: leaderboardResults,
					message: `Recalculated ${leaderboardResults.length} leaderboards`
				});
				break;
			}

			case 'live-games': {
				// Check live games every 2 minutes
				if (!force && CacheHelpers.cronRanRecently('live-games', 2)) {
					results.push({
						job: 'live-games',
						skipped: true,
						reason: 'Checked recently',
						last_run: cache.getAge(CacheKeys.cronJob('live-games'))
					});
					break;
				}

				// Check live fixtures and update if needed
				console.log('⚽ Checking live games...');
				const liveResult = await checkLiveFixtures();

				// If live fixtures were updated, trigger leaderboard recalculation
				if (liveResult.predictionsProcessed > 0) {
					console.log(
						`⚽ ${liveResult.predictionsProcessed} live fixtures updated, triggering leaderboard recalculation...`
					);
					const leaderboardResults = await recalculateAllLeaderboards('2025-26', false);
					CacheHelpers.markCronCompleted('leaderboards');

					results.push({
						job: 'live-games',
						live_check: liveResult,
						leaderboards: leaderboardResults,
						message: `Updated ${liveResult.predictionsProcessed} live fixtures, recalculated ${leaderboardResults.length} leaderboards`
					});
				} else {
					results.push({
						job: 'live-games',
						live_check: liveResult,
						message: 'No live fixtures needed updating'
					});
				}
				break;
			}

			case 'health': {
				// Always allow health checks
				const stats = cache.getStats();
				const cronJobs = stats.keys
					.filter((key) => key.startsWith('cron:'))
					.map((key) => {
						const jobName = key.replace('cron:', '');
						const age = cache.getAge(key);
						return {
							name: jobName,
							last_run_minutes_ago: age,
							is_healthy: age !== null && age < 60 // Healthy if ran in last hour
						};
					});

				results.push({
					job: 'health',
					cache_stats: stats,
					cron_jobs: cronJobs,
					timestamp: new Date().toISOString()
				});
				break;
			}

			default:
				return json({ error: 'Invalid job type' }, { status: 400 });
		}

		return json({
			success: true,
			results,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Intelligent processor error:', error);
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
