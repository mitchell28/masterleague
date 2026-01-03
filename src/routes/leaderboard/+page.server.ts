import { db } from '$lib/server/db';
import { user as authUser, organization } from '$lib/server/db/auth/auth-schema';
import { leagueTable, predictions, fixtures } from '$lib/server/db/schema';
import { eq, and, sum, sql, desc, asc } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { MetaTagsProps } from 'svelte-meta-tags';
import { getLeaderboardWeek, getCurrentWeek } from '$lib/server/engine/data/fixtures';
import { getLeaderboard } from '$lib/server/engine/analytics/leaderboard.js';
import { getRankingHistory } from '$lib/server/engine/analytics';

// Type for weekly points breakdown
interface WeeklyPointsData {
	weekId: number;
	points: number;
	correctScorelines: number;
	correctOutcomes: number;
	totalPredictions: number;
}

interface UserWeeklyBreakdown {
	userId: string;
	username: string;
	totalPoints: number;
	weeklyBreakdown: WeeklyPointsData[];
}

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

	// Get week filter from URL params (null = overview/all weeks)
	const weekParam = url.searchParams.get('week');
	const selectedWeek = weekParam ? parseInt(weekParam, 10) : null;

	const cacheKey = `leaderboard:${userId}:week-${selectedWeek || 'all'}`;

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
			leaderboardMeta: null,
			availableWeeks: [],
			selectedWeek: null,
			weeklyPointsBreakdown: []
		};
		setCache(cacheKey, fallbackData, 60000); // 1 minute for empty state
		return fallbackData;
	}

	const selectedOrganization = defaultOrganization[0];

	try {
		// Get current week first (cached internally)
		const currentWeek = await getLeaderboardWeek();

		// Cache keys for shared data
		const weeksCacheKey = `weeks:${selectedOrganization.id}`;
		const weeklyPointsCacheKey = `weekly-points:${selectedOrganization.id}`;

		// Try to get cached weeks data
		let availableWeeksData = getCached<{ weekId: number }[]>(weeksCacheKey);
		let allWeeklyPoints = getCached<any[]>(weeklyPointsCacheKey);

		// Parallel fetch only what we need
		const fetchPromises: Promise<any>[] = [getLeaderboard(selectedOrganization.id, '2025-26')];

		if (!availableWeeksData) {
			fetchPromises.push(
				db
					.selectDistinct({ weekId: fixtures.weekId })
					.from(fixtures)
					.where(eq(fixtures.season, '2025-26'))
					.orderBy(asc(fixtures.weekId))
			);
		}

		if (!allWeeklyPoints) {
			fetchPromises.push(
				db
					.select({
						userId: predictions.userId,
						weekId: fixtures.weekId,
						points: sum(predictions.points),
						// Correct Score: Exact match of home and away scores
						correctScorelines: sql<number>`COUNT(CASE WHEN ${predictions.predictedHomeScore} = ${fixtures.homeScore} AND ${predictions.predictedAwayScore} = ${fixtures.awayScore} THEN 1 END)`,
						// Correct Outcome: Same result (win/draw/loss) but NOT exact score
						correctOutcomes: sql<number>`COUNT(CASE 
							WHEN (${predictions.predictedHomeScore} != ${fixtures.homeScore} OR ${predictions.predictedAwayScore} != ${fixtures.awayScore}) 
							AND (
								(${predictions.predictedHomeScore} > ${predictions.predictedAwayScore} AND ${fixtures.homeScore} > ${fixtures.awayScore}) OR 
								(${predictions.predictedHomeScore} < ${predictions.predictedAwayScore} AND ${fixtures.homeScore} < ${fixtures.awayScore}) OR 
								(${predictions.predictedHomeScore} = ${predictions.predictedAwayScore} AND ${fixtures.homeScore} = ${fixtures.awayScore})
							) 
							THEN 1 
						END)`,
						totalPredictions: sql<number>`COUNT(*)`
					})
					.from(predictions)
					.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
					.where(
						and(
							eq(predictions.organizationId, selectedOrganization.id),
							eq(fixtures.season, '2025-26'),
							eq(fixtures.status, 'FINISHED')
						)
					)
					.groupBy(predictions.userId, fixtures.weekId)
			);
		}

		const results = await Promise.all(fetchPromises);
		const leaderboard = results[0];

		// Assign fetched data or use cached
		let resultIndex = 1;
		if (!availableWeeksData) {
			availableWeeksData = results[resultIndex++];
			setCache(weeksCacheKey, availableWeeksData, 600000); // 10 min cache for weeks
		}
		if (!allWeeklyPoints) {
			allWeeklyPoints = results[resultIndex++];
			setCache(weeklyPointsCacheKey, allWeeklyPoints, 120000); // 2 min cache for points (updates more often)
		}

		const availableWeeks = (availableWeeksData || [])
			.map((w) => w.weekId)
			.filter((w) => w <= currentWeek);

		// Create a map of userId -> weekId -> points data
		const userWeeklyMap = new Map<string, Map<number, WeeklyPointsData>>();
		for (const row of allWeeklyPoints || []) {
			if (!userWeeklyMap.has(row.userId)) {
				userWeeklyMap.set(row.userId, new Map());
			}
			userWeeklyMap.get(row.userId)!.set(row.weekId, {
				weekId: row.weekId,
				points: Number(row.points) || 0,
				correctScorelines: Number(row.correctScorelines) || 0,
				correctOutcomes: Number(row.correctOutcomes) || 0,
				totalPredictions: Number(row.totalPredictions) || 0
			});
		}

		// Enhance leaderboard with weekly data (optimized - minimal object creation)
		let enhancedLeaderboard: any[] = leaderboard;
		if (leaderboard.length > 0) {
			enhancedLeaderboard = leaderboard.map((entry: any) => {
				const userWeeks = userWeeklyMap.get(entry.userId);
				const currentWeekData = userWeeks?.get(currentWeek);

				// Build weekly breakdown array (only for weeks up to current)
				const weeklyBreakdown: WeeklyPointsData[] = [];
				if (userWeeks) {
					for (const weekId of availableWeeks) {
						const weekData = userWeeks.get(weekId);
						weeklyBreakdown.push({
							weekId,
							points: weekData?.points || 0,
							correctScorelines: weekData?.correctScorelines || 0,
							correctOutcomes: weekData?.correctOutcomes || 0,
							totalPredictions: weekData?.totalPredictions || 0
						});
					}
				}

				return {
					...entry,
					weeklyPoints: currentWeekData?.points || 0,
					weeklyBreakdown
				};
			});

			// If a specific week is selected, calculate that week's points AND cumulative up to that week
			if (selectedWeek !== null) {
				enhancedLeaderboard = enhancedLeaderboard
					.map((entry: any) => {
						const weekData = entry.weeklyBreakdown?.find(
							(w: WeeklyPointsData) => w.weekId === selectedWeek
						);

						// Calculate cumulative points up to and including selected week
						let cumulativePoints = 0;
						let cumulativeCorrect = 0;
						for (const w of entry.weeklyBreakdown || []) {
							if (w.weekId <= selectedWeek) {
								cumulativePoints += w.points;
								cumulativeCorrect += w.correctScorelines;
							}
						}

						return {
							...entry,
							weeklyFilteredScore: weekData?.points || 0,
							weeklyFilteredCorrect: weekData?.correctScorelines || 0,
							cumulativePoints,
							cumulativeCorrect
						};
					})
					.sort((a: any, b: any) => (b.cumulativePoints || 0) - (a.cumulativePoints || 0));
			}
		}

		// Meta tags for SEO
		const pageTitle = selectedWeek ? `Week ${selectedWeek} Standings` : 'Overall Standings';
		const pageMetaTags = Object.freeze({
			title: pageTitle,
			description:
				'View the current leaderboard standings and see how you rank against other players in your prediction groups.',
			canonical: new URL(url.pathname, url.origin).href,
			openGraph: {
				title: `${pageTitle} - Master League`,
				description:
					'View the current leaderboard standings and see how you rank against other players.',
				url: new URL(url.pathname, url.origin).href
			},
			twitter: {
				title: `${pageTitle} - Master League`,
				description:
					'View the current leaderboard standings and see how you rank against other players.'
			}
		}) satisfies MetaTagsProps;

		// Get ranking history for the chart
		const { rankingHistory } = await getRankingHistory(selectedOrganization.id, '2025-26');

		const result = {
			currentWeek,
			leaderboard: enhancedLeaderboard,
			selectedOrganization,
			user: locals.user,
			currentSeason: '2025-26',
			leaderboardMeta: null,
			pageMetaTags,
			availableWeeks,
			selectedWeek,
			rankingHistory,
			currentUserId: locals.user.id
		};

		// Cache the result for 5 minutes
		setCache(cacheKey, result, 300000);
		return result;
	} catch (error) {
		console.error('Error loading leaderboard:', error);
		const currentWeek = await getLeaderboardWeek();

		// Return minimal data on error
		const errorResult = {
			currentWeek,
			leaderboard: [],
			selectedOrganization,
			user: locals.user,
			currentSeason: '2025-26',
			leaderboardMeta: null,
			pageMetaTags: {
				title: 'Leaderboard - Error',
				description: 'Leaderboard temporarily unavailable'
			},
			availableWeeks: [] as number[],
			selectedWeek: null as number | null,
			rankingHistory: [],
			currentUserId: locals.user.id
		};

		// Short cache for error state
		setCache(cacheKey, errorResult, 30000); // 30 seconds
		return errorResult;
	}
}) satisfies PageServerLoad;
