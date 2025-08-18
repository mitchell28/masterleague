import { json } from '@sveltejs/kit';
import {
	recalculateLeaderboard,
	recalculateAllLeaderboards
} from '$lib/server/engine/shared/index.js';
import { cache, CacheKeys } from '$lib/server/cache/simple-cache.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/update-leaderboard
 * Manually trigger leaderboard recalculation
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json().catch(() => ({}));
		const { organizationId, season = '2025-26', force = false, all = false } = body;

		let results;

		if (all) {
			// Recalculate for all organizations
			results = await recalculateAllLeaderboards(season, force);
		} else if (organizationId) {
			// Recalculate for specific organization
			const result = await recalculateLeaderboard(organizationId, season, force);
			results = [result];
		} else {
			return json(
				{
					error: 'Either organizationId or all=true must be specified',
					results: []
				},
				{ status: 400 }
			);
		}

		const successCount = results.filter((r) => r.success).length;
		const totalCount = results.length;

		return json({
			success: successCount > 0,
			message: `Successfully updated ${successCount}/${totalCount} leaderboards`,
			results,
			summary: {
				total: totalCount,
				successful: successCount,
				failed: totalCount - successCount,
				totalUsersUpdated: results.reduce((sum, r) => sum + r.usersUpdated, 0),
				totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0)
			}
		});
	} catch (error) {
		console.error('Update leaderboard API error:', error);
		return json(
			{
				error: 'Failed to update leaderboard',
				message: error instanceof Error ? error.message : 'Unknown error',
				results: []
			},
			{ status: 500 }
		);
	}
};

/**
 * GET /api/update-leaderboard
 * Get status of leaderboard updates (for cron monitoring)
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const organizationId = url.searchParams.get('organizationId');
		const season = url.searchParams.get('season') || '2025-26';

		if (!organizationId) {
			return json(
				{
					error: 'organizationId parameter is required for status check'
				},
				{ status: 400 }
			);
		}

		// Import cache utilities
		const { LeaderboardCache, LeaderboardLock } = await import(
			'$lib/server/cache/leaderboard-cache.js'
		);

		const [meta, isLocked] = await Promise.all([
			LeaderboardCache.getMeta(organizationId, season),
			LeaderboardLock.isLocked(organizationId, season)
		]);

		return json({
			success: true,
			status: {
				organizationId,
				season,
				isLocked,
				meta,
				timestamp: new Date().toISOString()
			}
		});
	} catch (error) {
		console.error('Leaderboard status API error:', error);
		return json(
			{
				error: 'Failed to get leaderboard status',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
