import { json } from '@sveltejs/kit';
import { fixUnprocessedPredictions } from '$lib/server/engine/safety/prediction-safety-check.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/cron/prediction-safety-check
 * Safety check to find and fix predictions that weren't processed
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { daysBack = 7, force = false } = await request.json().catch(() => ({}));

		console.log(`🛡️ Running prediction safety check (${daysBack} days back)...`);

		const result = await fixUnprocessedPredictions(daysBack);

		console.log(`🛡️ Safety check complete:`, {
			fixturesChecked: result.fixturesChecked,
			predictionsFixed: result.predictionsFixed,
			pointsAwarded: result.pointsAwarded,
			errors: result.errors.length
		});

		return json({
			success: result.success,
			result,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Prediction safety check error:', error);
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
