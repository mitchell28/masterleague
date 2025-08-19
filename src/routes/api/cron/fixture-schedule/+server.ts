import { json } from '@sveltejs/kit';
import { checkFixtureScheduleChanges } from '$lib/server/engine/data/processing/fixtureScheduleChecker.js';
import { cache, CacheKeys, CacheHelpers } from '$lib/server/cache/simple-cache.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/cron/fixture-schedule
 * Mega simple fixture schedule checking
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { force } = await request.json().catch(() => ({}));

		// Check if we ran recently (30 minutes default to prevent spam) - unless forced
		if (!force && CacheHelpers.cronRanRecently('fixture-schedule', 30)) {
			const lastRunMinutesAgo = cache.getAge(CacheKeys.cronJob('fixture-schedule'));
			return json({
				success: true,
				message: 'Fixture schedule check ran recently, skipping',
				last_run_minutes_ago: lastRunMinutesAgo
			});
		}

		// Get API key from environment
		const apiKey = process.env.FOOTBALL_DATA_API_KEY;
		if (!apiKey) {
			throw new Error('FOOTBALL_DATA_API_KEY environment variable is required');
		}

		console.log('🔍 Starting fixture schedule check...');

		// Run the fixture schedule checker with AGGRESSIVE batching for maximum speed
		const result = await checkFixtureScheduleChanges({
			apiKey,
			recentLimit: 15, // Check more recent matches
			batchSize: 50, // 50 fixtures per API call (much faster!)
			delayMs: 6500 // 6.5 second delay = 9.2 calls/minute (safely under 10/min)
		});

		// Mark job as completed
		CacheHelpers.markCronCompleted('fixture-schedule');

		console.log(
			`✅ Fixture schedule check completed: ${result.checked} checked, ${result.updated} updated`
		);

		return json({
			success: true,
			checked: result.checked,
			updated: result.updated,
			changes: result.changes,
			message: `Checked ${result.checked} fixtures, updated ${result.updated}`,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('❌ Fixture schedule check failed:', error);

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
