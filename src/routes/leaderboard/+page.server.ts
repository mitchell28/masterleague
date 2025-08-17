import { db } from '$lib/server/db';
import { user as authUser, organization } from '$lib/server/db/auth/auth-schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import { getCurrentWeek } from '$lib/server/engine/data/fixtures';
import { getLeaderboard } from '$lib/server/engine/analytics/leaderboard.js';
import { LeaderboardCache, CurrentWeekCache } from '$lib/server/cache/leaderboard-cache.js';
import {
	intelligentLeaderboardProcessing,
	triggerBackgroundProcessing
} from '$lib/server/engine/data/processing/';

export const load = (async ({ locals, url, fetch }) => {
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	}

	// Check if email is verified
	if (!locals.user.emailVerified) {
		throw redirect(302, '/auth/verify-email');
	}

	// Get the default organization
	const defaultOrganization = await db
		.select()
		.from(organization)
		.where(eq(organization.slug, 'master-league'))
		.limit(1);

	if (!defaultOrganization[0]) {
		return {
			currentWeek: await getCurrentWeek(),
			leaderboard: [],
			selectedOrganization: null,
			user: locals.user,
			currentSeason: '2025',
			leaderboardMeta: null
		};
	}

	const selectedOrganization = defaultOrganization[0];
	const currentSeason = '2025'; // Match the actual season format in fixtures

	try {
		const startTime = Date.now();

		const currentWeek = await CurrentWeekCache.get();

		// Get leaderboard metadata first using the optimized cache
		const leaderboardMeta = await LeaderboardCache.getMeta(selectedOrganization.id, currentSeason);

		// Intelligent processing decision
		const processingDecision = await intelligentLeaderboardProcessing(leaderboardMeta, currentWeek);

		let leaderboard;
		let actualMeta = leaderboardMeta;

		if (processingDecision.shouldRefresh) {
			// Always use background refresh for leaderboards since they're not time-critical
			// and can be expensive to calculate
			triggerBackgroundProcessing('refresh-leaderboard', {
				organizationId: selectedOrganization.id,
				season: currentSeason,
				fetch: fetch // Pass SvelteKit's fetch function
			});

			// Get current leaderboard (may be slightly stale but loads fast)
			leaderboard = await getLeaderboard(selectedOrganization.id, currentSeason);

			// Get fresh metadata after background processing
			actualMeta =
				(await LeaderboardCache.getMeta(selectedOrganization.id, currentSeason)) || leaderboardMeta;
		} else {
			// Use cached data
			leaderboard = await getLeaderboard(selectedOrganization.id, currentSeason);
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
					'View the current leaderboard standings and see how you rank against other players in your prediction groups.',
				url: new URL(url.pathname, url.origin).href
			},
			twitter: {
				title: 'Leaderboard - Master League',
				description:
					'View the current leaderboard standings and see how you rank against other players in your prediction groups.'
			}
		}) satisfies MetaTagsProps;

		return {
			currentWeek,
			leaderboard,
			selectedOrganization,
			currentSeason,
			leaderboardMeta: actualMeta,
			pageMetaTags,
			processingInfo: processingDecision.reason
		};
	} catch (error) {
		console.error('Failed to load leaderboard:', error);

		// Fallback to empty leaderboard
		return {
			currentWeek: await getCurrentWeek(),
			leaderboard: [],
			selectedOrganization,
			currentSeason,
			leaderboardMeta: null,
			pageMetaTags: {
				title: 'Leaderboard',
				description: 'View the current leaderboard standings.'
			}
		};
	}
}) satisfies PageServerLoad;
