import { json } from '@sveltejs/kit';
import { checkFixtureScheduleChanges } from '$lib/server/engine/data/processing/fixtureScheduleChecker.js';
import { CacheHelpers } from '$lib/server/cache/simple-cache.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/cron/fixture-schedule
 * Mega simple fixture schedule checking
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Check if we ran recently (30 minutes default to prevent spam)
		if (CacheHelpers.cronRanRecently('fixture-schedule', 30)) {
			return json({
				success: true,
				message: 'Fixture schedule check ran recently, skipping',
				last_run_minutes_ago: CacheHelpers.getLastRunMinutesAgo('fixture-schedule')
			});
		}

		// Get API key from environment
		const apiKey = process.env.FOOTBALL_DATA_API_KEY;
		if (!apiKey) {
			throw new Error('FOOTBALL_DATA_API_KEY environment variable is required');
		}

		console.log('🔍 Starting fixture schedule check...');

		// Run the fixture schedule checker
		const result = await checkFixtureScheduleChanges({
			apiKey,
			recentLimit: 15, // Check last 15 recent matches
			batchSize: 10, // Smaller batches for better rate limiting
			delayMs: 2000 // 2 second delay between batches
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
