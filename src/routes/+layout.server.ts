import type { MetaTagsProps } from 'svelte-meta-tags';
import type { LayoutServerLoad } from './$types';
import { getCurrentWeek } from '$lib/server/engine/data/fixtures';
import { lightCache } from '$lib/server/light-cache';
import {
	getSeasonState,
	daysUntilSeasonStart,
	CURRENT_SEASON,
	PREVIOUS_SEASON,
	CURRENT_SEASON_CONFIG
} from '$lib/server/config/season';
import { db } from '$lib/server/db';
import { leagueTable } from '$lib/server/db/schema';
import { user as authUser, organization } from '$lib/server/db/auth/auth-schema';
import { eq, desc, and } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ url, locals }) => {
	// Compute season state on every request (cheap date comparison, no caching needed)
	const seasonState = getSeasonState();
	const daysUntilStart = daysUntilSeasonStart();
	const nextSeasonStart = CURRENT_SEASON_CONFIG.startDate.toISOString();

	// Cache key for layout data
	const cacheKey = 'layout:core-data';

	// Previous season podium - cache separately (only relevant during off-season)
	let previousSeasonPodium: { name: string; totalPoints: number; position: number }[] = [];
	if (seasonState !== 'in-season') {
		const podiumCacheKey = `layout:podium:${PREVIOUS_SEASON}`;
		const cachedPodium = lightCache.stable.get(podiumCacheKey);
		if (cachedPodium) {
			previousSeasonPodium = cachedPodium as typeof previousSeasonPodium;
		} else {
			try {
				const defaultOrg = await db
					.select({ id: organization.id })
					.from(organization)
					.where(eq(organization.slug, 'master-league'))
					.limit(1);

				if (defaultOrg[0]) {
					const podiumRows = await db
						.select({
							name: authUser.name,
							totalPoints: leagueTable.totalPoints
						})
						.from(leagueTable)
						.innerJoin(authUser, eq(leagueTable.userId, authUser.id))
						.where(
							and(
								eq(leagueTable.season, PREVIOUS_SEASON),
								eq(leagueTable.organizationId, defaultOrg[0].id)
							)
						)
						.orderBy(desc(leagueTable.totalPoints))
						.limit(3);

					previousSeasonPodium = podiumRows.map((row, i) => ({
						name: row.name ?? 'Unknown',
						totalPoints: row.totalPoints ?? 0,
						position: i + 1
					}));

					// Cache for 1 hour (previous season data won't change)
					lightCache.stable.set(podiumCacheKey, previousSeasonPodium, 3600000, ['leaderboard']);
				}
			} catch {
				// Non-critical — off-season screen still renders without podium
			}
		}
	}

	// Try to get cached core data first
	const cached = lightCache.stable.get(cacheKey);
	if (cached) {
		return {
			...cached,
			user: locals.user,
			seasonState,
			daysUntilStart,
			nextSeasonStart,
			previousSeasonPodium,
			currentSeason: CURRENT_SEASON,
			previousSeason: PREVIOUS_SEASON
		};
	}

	// Get current week (weeks are typically 1-38 for Premier League)
	const currentWeek = await getCurrentWeek();
	const weeks = Array.from({ length: 38 }, (_, i) => i + 1); // Generate weeks 1-38

	const baseMetaTags = Object.freeze({
		title: 'Home',
		titleTemplate: '%s | Master League',
		description:
			'Master League - The ultimate prediction league platform for sports enthusiasts. Create groups, make predictions, and compete with friends.',
		canonical: new URL(url.pathname, url.origin).href,
		robots: 'index,follow',
		keywords: ['sports', 'predictions', 'league', 'competition', 'groups', 'leaderboard'],
		openGraph: {
			type: 'website',
			url: new URL(url.pathname, url.origin).href,
			locale: 'en_US',
			title: 'Master League - Sports Prediction Platform',
			description:
				'Master League - The ultimate prediction league platform for sports enthusiasts. Create groups, make predictions, and compete with friends.',
			siteName: 'Master League',
			images: [
				{
					url: new URL('/ogimage/Master-League-OG.png', url.origin).href,
					alt: 'Master League - Sports Prediction Platform',
					width: 1200,
					height: 630,
					secureUrl: new URL('/ogimage/Master-League-OG.png', url.origin).href,
					type: 'image/png'
				}
			]
		},
		twitter: {
			cardType: 'summary_large_image' as const,
			site: '@masterleague',
			creator: '@masterleague',
			title: 'Master League - Sports Prediction Platform',
			description:
				'The ultimate prediction league platform for sports enthusiasts. Create groups, make predictions, and compete with friends.',
			image: new URL('/ogimage/Master-League-OG.png', url.origin).href,
			imageAlt: 'Master League - Sports Prediction Platform'
		},
		additionalMetaTags: [
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1'
			},
			{
				name: 'theme-color',
				content: '#2EFF9B'
			},
			{
				name: 'author',
				content: 'Master League'
			},
			{
				name: 'application-name',
				content: 'Master League'
			}
		],
		additionalLinkTags: [
			{
				rel: 'icon',
				href: '/favicon.ico'
			},
			{
				rel: 'apple-touch-icon',
				href: '/apple-touch-icon.png'
			}
		]
	}) satisfies MetaTagsProps;

	const coreData = {
		currentWeek,
		weeks,
		baseMetaTags
	};

	// Cache for 10 minutes (weeks data doesn't change often)
	lightCache.stable.set(cacheKey, coreData, 600000, ['weeks', 'layout']);

	return {
		...coreData,
		user: locals.user,
		seasonState,
		daysUntilStart,
		nextSeasonStart,
		previousSeasonPodium,
		currentSeason: CURRENT_SEASON,
		previousSeason: PREVIOUS_SEASON
	};
};
