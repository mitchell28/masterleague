import { json } from '@sveltejs/kit';
import { getLeaderboard } from '$lib/server/engine/shared/index.js';
import type { RequestHandler } from './$types.js';

/**
 * GET /api/leaderboard
 * Returns leaderboard data for an organization (simplified, no caching)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const organizationId = url.searchParams.get('organizationId');
		const season = url.searchParams.get('season') || '2025-26';

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

		// Get leaderboard data directly from database
		const leaderboardData = await getLeaderboard(organizationId, season);

		return json({
			success: true,
			data: leaderboardData,
			meta: {
				organizationId,
				season,
				totalUsers: leaderboardData.length,
				lastFetched: new Date().toISOString(),
				fromCache: false // No caching anymore
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
