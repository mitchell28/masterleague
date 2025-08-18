import { json } from '@sveltejs/kit';
import { cache, CacheKeys, CacheHelpers } from '$lib/server/cache/simple-cache.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/cron/coordinate
 * Simple cron coordination with intelligent processing
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action, jobName, intervalMinutes = 5 } = await request.json();

		switch (action) {
			case 'should_run': {
				// Check if this job ran recently
				const ranRecently = CacheHelpers.cronRanRecently(jobName, intervalMinutes);

				return json({
					should_run: !ranRecently,
					last_run_minutes_ago: cache.getAge(CacheKeys.cronJob(jobName)),
					message: ranRecently
						? `Job ${jobName} ran recently, skipping`
						: `Job ${jobName} should run now`
				});
			}

			case 'mark_completed': {
				// Mark job as completed
				CacheHelpers.markCronCompleted(jobName);

				return json({
					success: true,
					message: `Job ${jobName} marked as completed`
				});
			}

			case 'force_run': {
				// Clear the cache for this job to force it to run
				cache.delete(CacheKeys.cronJob(jobName));

				return json({
					success: true,
					message: `Job ${jobName} cache cleared, will run on next check`
				});
			}

			case 'status': {
				// Get status of all cron jobs
				const stats = cache.getStats();
				const cronJobs = stats.keys
					.filter((key) => key.startsWith('cron:'))
					.map((key) => {
						const jobName = key.replace('cron:', '');
						const age = cache.getAge(key);
						return {
							name: jobName,
							last_run_minutes_ago: age,
							is_fresh: age !== null && age < 30 // Fresh if ran in last 30 minutes
						};
					});

				return json({
					success: true,
					total_cache_items: stats.size,
					cron_jobs: cronJobs
				});
			}

			default:
				return json({ error: 'Invalid action' }, { status: 400 });
		}
	} catch (error) {
		console.error('Cron coordinate error:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
