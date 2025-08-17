import { json } from '@sveltejs/kit';
import { getLeaderboard } from '$lib/server/engine/shared/index.js';
import { LeaderboardCache } from '$lib/server/cache/leaderboard-cache.js';
import type { RequestHandler } from './$types.js';

/**
 * GET /api/leaderboard
 * Returns cached leaderboard data for an organization
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const organizationId = url.searchParams.get('organizationId');
		const season = url.searchParams.get('season') || '2025-26';
		const forceRefresh = url.searchParams.get('refresh') === 'true';

		if (!organizationId) {
			return json(
				{
					error: 'organizationId parameter is required',
					data: [],
					meta: null
				},
				{ status: 400 }
			);
		}

		// Check user authentication and organization access
		if (!locals.user) {
			return json(
				{
					error: 'Authentication required',
					data: [],
					meta: null
				},
				{ status: 401 }
			);
		}

		let leaderboardData;
		let fromCache = true;

		if (forceRefresh) {
			// Force refresh - invalidate cache and get fresh data
			await LeaderboardCache.invalidate(organizationId, season);
			leaderboardData = await getLeaderboard(organizationId, season);
			fromCache = false;
		} else {
			// Try cache first, fallback to fresh data
			const cached = await LeaderboardCache.get(organizationId, season);
			if (cached && cached.data.length > 0) {
				leaderboardData = cached.data;
			} else {
				leaderboardData = await getLeaderboard(organizationId, season);
				fromCache = false;
			}
		}

		// Get metadata
		const meta = await LeaderboardCache.getMeta(organizationId, season);

		return json({
			success: true,
			data: leaderboardData,
			meta: {
				...meta,
				fromCache,
				organizationId,
				season,
				totalUsers: leaderboardData.length,
				lastFetched: new Date().toISOString()
			}
		});
	} catch (error) {
		console.error('Leaderboard API error:', error);
		return json(
			{
				error: 'Failed to fetch leaderboard',
				message: error instanceof Error ? error.message : 'Unknown error',
				data: [],
				meta: null
			},
			{ status: 500 }
		);
	}
};
