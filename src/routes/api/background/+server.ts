import { json } from '@sveltejs/kit';
import {
	updatePredictions,
	updatePredictionsForFixture,
	type PredictionUpdateResult
} from '$lib/server/engine/shared/index.js';
import {
	recalculateLeaderboard,
	recalculateAllLeaderboards,
	type RecalculationResult
} from '$lib/server/engine/shared/index.js';
import { checkFixtureScheduleChanges } from '$lib/server/engine/data/processing/index.js';
import { FOOTBALL_DATA_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/background
 * Execute background functions for predictions and leaderboard processing
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json().catch(() => ({}));
		const { action, organizationId, season = '2025-26', fixtureId, force = false } = body;

		// Check authentication (optional for cron jobs)
		const isAuthorized = locals.user || isValidCronRequest(request);

		if (!isAuthorized) {
			return json(
				{
					error: 'Authentication required',
					result: null
				},
				{ status: 401 }
			);
		}

		let result;

		switch (action) {
			case 'update-predictions':
				// Process predictions for finished matches
				result = await updatePredictions();
				break;

			case 'update-prediction-fixture':
				// Process predictions for a specific fixture
				if (!fixtureId) {
					return json(
						{
							error: 'fixtureId is required for update-prediction-fixture action',
							result: null
						},
						{ status: 400 }
					);
				}
				// Use the specific fixture update function
				result = await updatePredictionsForFixture(fixtureId);
				break;

			case 'recalculate-leaderboard':
				// Recalculate leaderboard for specific organization
				if (!organizationId) {
					return json(
						{
							error: 'organizationId is required for recalculate-leaderboard action',
							result: null
						},
						{ status: 400 }
					);
				}
				result = await recalculateLeaderboard(organizationId, season, force);
				break;

			case 'refresh-leaderboard':
				// Smart refresh: recalculate leaderboard for specific organization (alias for recalculate-leaderboard)
				if (!organizationId) {
					return json(
						{
							error: 'organizationId is required for refresh-leaderboard action',
							result: null
						},
						{ status: 400 }
					);
				}
				result = await recalculateLeaderboard(organizationId, season, false); // Don't force, use smart caching
				break;

			case 'check-fixture-schedules':
				// Check for fixture schedule changes (date/status updates)
				if (!FOOTBALL_DATA_API_KEY) {
					return json(
						{
							error: 'FOOTBALL_DATA_API_KEY not configured',
							result: null
						},
						{ status: 500 }
					);
				}

				result = await checkFixtureScheduleChanges({
					apiKey: FOOTBALL_DATA_API_KEY,
					recentLimit: 15, // Check recent 15 matches
					batchSize: 12, // Smaller batches for rate limiting
					delayMs: 2000 // 2 second delay between batches
				});
				break;

			case 'recalculate-all-leaderboards':
				// Recalculate leaderboards for all organizations
				const results = await recalculateAllLeaderboards(season, force);
				result = {
					success: results.some((r) => r.success),
					results,
					summary: {
						total: results.length,
						successful: results.filter((r) => r.success).length,
						failed: results.filter((r) => !r.success).length,
						totalUsersUpdated: results.reduce((sum, r) => sum + r.usersUpdated, 0),
						totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0)
					}
				};
				break;

			case 'full-sync':
				// Full sync: update predictions first, then recalculate leaderboards
				const predictionResult = await updatePredictions();
				const leaderboardResults = await recalculateAllLeaderboards(season, true);

				result = {
					success: predictionResult.success && leaderboardResults.some((r) => r.success),
					predictionResult,
					leaderboardResults,
					summary: {
						predictionsProcessed: predictionResult.predictionsProcessed,
						leaderboardsUpdated: leaderboardResults.filter((r) => r.success).length,
						totalExecutionTime:
							predictionResult.executionTime +
							leaderboardResults.reduce((sum, r) => sum + r.executionTime, 0)
					}
				};
				break;

			default:
				return json(
					{
						error:
							'Invalid action. Supported actions: update-predictions, update-prediction-fixture, recalculate-leaderboard, recalculate-all-leaderboards, full-sync',
						result: null
					},
					{ status: 400 }
				);
		}

		// Determine success based on result type
		let success = false;
		if ('success' in result) {
			success = result.success;
		} else if ('error' in result && !result.error) {
			// FixtureScheduleResult - success if no error
			success = true;
		} else if ('checked' in result) {
			// FixtureScheduleResult - success if we checked fixtures
			success = result.checked >= 0;
		}

		return json({
			success,
			action,
			result,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Background API error:', error);
		return json(
			{
				error: 'Background task failed',
				message: error instanceof Error ? error.message : 'Unknown error',
				result: null
			},
			{ status: 500 }
		);
	}
};

/**
 * GET /api/background
 * Get status and health check for background functions
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const { LeaderboardCache, LeaderboardLock } = await import(
			'$lib/server/cache/leaderboard-cache.js'
		);

		// Get status for various organizations (if specified)
		const organizationId = url.searchParams.get('organizationId');
		const season = url.searchParams.get('season') || '2025-26';

		let status: any = {
			timestamp: new Date().toISOString(),
			healthy: true
		};

		if (organizationId) {
			const [meta, isLocked, cached] = await Promise.all([
				LeaderboardCache.getMeta(organizationId, season),
				LeaderboardLock.isLocked(organizationId, season),
				LeaderboardCache.get(organizationId, season)
			]);

			status = {
				...status,
				organizationId,
				season,
				isLocked,
				meta,
				cacheStatus: {
					hasCachedData: !!cached,
					dataCount: cached?.totalUsers || 0,
					lastCached: cached?.lastUpdated || null
				}
			};
		}

		return json({
			success: true,
			status,
			availableActions: [
				'update-predictions',
				'update-prediction-fixture',
				'recalculate-leaderboard',
				'recalculate-all-leaderboards',
				'full-sync'
			]
		});
	} catch (error) {
		console.error('Background status API error:', error);
		return json(
			{
				error: 'Failed to get background status',
				message: error instanceof Error ? error.message : 'Unknown error',
				status: null
			},
			{ status: 500 }
		);
	}
};

/**
 * Check if request is from a valid cron source
 * You might want to add specific headers or authentication for cron jobs
 */
function isValidCronRequest(request: Request): boolean {
	// Add your cron authentication logic here
	// For example, check for specific headers or IP addresses
	const cronHeader = request.headers.get('x-cron-secret');
	const expectedSecret = process.env.CRON_SECRET;

	if (expectedSecret && cronHeader === expectedSecret) {
		return true;
	}

	// Allow localhost for development
	const origin = request.headers.get('origin') || request.headers.get('host');
	if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
		return true;
	}

	return false;
}
