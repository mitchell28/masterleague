import { db } from '$lib/server/db';
import { user as authUser, organization } from '$lib/server/db/auth/auth-schema';
import { leagueTable, predictions, fixtures } from '$lib/server/db/schema';
import { eq, and, sum } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import { getLeaderboardWeek, getCurrentWeek } from '$lib/server/engine/data/fixtures';
import { getLeaderboard } from '$lib/server/engine/analytics/leaderboard.js';

// Simple cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function getCached<T>(key: string): T | null {
	const item = cache.get(key);
	if (!item) return null;
	if (Date.now() - item.timestamp > item.ttl) {
		cache.delete(key);
		return null;
	}
	return item.data;
}

function setCache(key: string, data: any, ttlMs: number = 300000): void {
	cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

export const load = (async ({ locals, url }) => {
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	} else if (!locals.user.emailVerified) {
		throw redirect(302, '/auth/verify-email');
	}

	const userId = locals.user.id;
	const cacheKey = `leaderboard:${userId}`;

	// Try cache first (5 minute TTL)
	const cached = getCached(cacheKey);
	if (cached) {
		return cached;
	}

	// Get the default organization with caching
	const orgCacheKey = 'default-org';
	let defaultOrganization = getCached<any[]>(orgCacheKey);

	if (!defaultOrganization) {
		defaultOrganization = await db
			.select()
			.from(organization)
			.where(eq(organization.slug, 'master-league'))
			.limit(1);
		setCache(orgCacheKey, defaultOrganization, 600000); // 10 minutes
	}

	if (!defaultOrganization[0]) {
		const fallbackData = {
			currentWeek: await getLeaderboardWeek(),
			leaderboard: [],
			selectedOrganization: null,
			user: locals.user,
			currentSeason: '2025-26',
			leaderboardMeta: null
		};
		setCache(cacheKey, fallbackData, 60000); // 1 minute for empty state
		return fallbackData;
	}

	const selectedOrganization = defaultOrganization[0];

	try {
		// Parallel data fetching for better performance
		const [currentWeek, leaderboard] = await Promise.all([
			getLeaderboardWeek(),
			getLeaderboard(selectedOrganization.id, '2025-26')
		]);

		// Only calculate weekly points if we have leaderboard data
		let enhancedLeaderboard = leaderboard;
		if (leaderboard.length > 0) {
			// Get weekly points for current week in parallel
			const weeklyPointsData = await db
				.select({
					userId: predictions.userId,
					weeklyPoints: sum(predictions.points)
				})
				.from(predictions)
				.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
				.where(
					and(
						eq(predictions.organizationId, selectedOrganization.id),
						eq(fixtures.season, '2025-26'),
						eq(fixtures.weekId, currentWeek)
					)
				)
				.groupBy(predictions.userId);

			// Create optimized lookup map
			const weeklyPointsMap = new Map(
				weeklyPointsData.map((wp) => [wp.userId, wp.weeklyPoints || 0])
			);

			// Enhance leaderboard with weekly points
			enhancedLeaderboard = leaderboard.map((entry) => ({
				...entry,
				weeklyPoints: weeklyPointsMap.get(entry.userId) || 0
			}));
		}

		// Meta tags for SEO
		const pageMetaTags = Object.freeze({
			title: 'Leaderboard',
			description:
				'View the current leaderboard standings and see how you rank against other players in your prediction groups.',
			canonical: new URL(url.pathname, url.origin).href,
			openGraph: {
				title: 'Leaderboard - Master League',
				description:
					'View the current leaderboard standings and see how you rank against other players.',
				url: new URL(url.pathname, url.origin).href
			},
			twitter: {
				title: 'Leaderboard - Master League',
				description:
					'View the current leaderboard standings and see how you rank against other players.'
			}
		}) satisfies MetaTagsProps;

		const result = {
			currentWeek,
			leaderboard: enhancedLeaderboard,
			selectedOrganization,
			user: locals.user,
			currentSeason: '2025-26',
			leaderboardMeta: null,
			pageMetaTags
		};

		// Cache the result for 5 minutes
		setCache(cacheKey, result, 300000);
		return result;
	} catch (error) {
		console.error('Error loading leaderboard:', error);

		// Return minimal data on error
		const errorResult = {
			currentWeek: await getLeaderboardWeek(),
			leaderboard: [],
			selectedOrganization,
			user: locals.user,
			currentSeason: '2025-26',
			leaderboardMeta: null,
			pageMetaTags: {
				title: 'Leaderboard - Error',
				description: 'Leaderboard temporarily unavailable'
			}
		};

		// Short cache for error state
		setCache(cacheKey, errorResult, 30000); // 30 seconds
		return errorResult;
	}
}) satisfies PageServerLoad;
