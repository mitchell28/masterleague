/**
 * Ranking History Analytics Module
 *
 * Provides functions for calculating ranking positions over time
 * and generating data for ranking charts.
 */

import { db } from '$lib/server/db';
import { user as authUser } from '$lib/server/db/auth/auth-schema';
import { leagueTable, predictions, fixtures } from '$lib/server/db/schema';
import { eq, and, sum, asc } from 'drizzle-orm';
import { getLeaderboardWeek } from '../data/fixtures';

// Re-export shared types for server-side imports
export type {
	UserRankingHistory,
	RankingPoint,
	WeeklyRanking,
	WeeklyPointsData
} from '$lib/types/analytics';

export { CHART_COLORS, getRankChange } from '$lib/types/analytics';

import type { UserRankingHistory, RankingPoint, WeeklyRanking } from '$lib/types/analytics';
import { CHART_COLORS } from '$lib/types/analytics';

/**
 * Complete ranking history result
 */
export interface RankingHistoryResult {
	rankingHistory: UserRankingHistory[];
	availableWeeks: number[];
	currentWeek: number;
}

/**
 * Get ranking history for all users in an organization
 *
 * Calculates cumulative points per week and determines rank positions
 * at each week. Returns data formatted for chart visualization.
 */
export async function getRankingHistory(
	organizationId: string,
	season: string = '2025-26'
): Promise<RankingHistoryResult> {
	const currentWeek = await getLeaderboardWeek();

	// Get all weekly points per user
	const weeklyPoints = await db
		.select({
			userId: predictions.userId,
			weekId: fixtures.weekId,
			points: sum(predictions.points)
		})
		.from(predictions)
		.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
		.where(
			and(
				eq(predictions.organizationId, organizationId),
				eq(fixtures.season, season),
				eq(fixtures.status, 'FINISHED')
			)
		)
		.groupBy(predictions.userId, fixtures.weekId)
		.orderBy(asc(fixtures.weekId));

	// Get available weeks with finished fixtures
	const weeksData = await db
		.selectDistinct({ weekId: fixtures.weekId })
		.from(fixtures)
		.where(and(eq(fixtures.season, season), eq(fixtures.status, 'FINISHED')))
		.orderBy(asc(fixtures.weekId));

	const availableWeeks = weeksData.map((w) => w.weekId).filter((w) => w <= currentWeek);

	// Get user names for the organization
	const users = await db
		.select({
			id: authUser.id,
			name: authUser.name
		})
		.from(authUser)
		.innerJoin(leagueTable, eq(leagueTable.userId, authUser.id))
		.where(eq(leagueTable.organizationId, organizationId));

	const userMap = new Map(users.map((u) => [u.id, u.name || 'Unknown']));

	// Build cumulative points per week per user
	const userCumulativePoints = new Map<string, Map<number, number>>();

	// Initialize all users
	for (const user of users) {
		userCumulativePoints.set(user.id, new Map());
	}

	// Add weekly points
	for (const row of weeklyPoints) {
		const userWeeks = userCumulativePoints.get(row.userId);
		if (userWeeks) {
			userWeeks.set(row.weekId, Number(row.points) || 0);
		}
	}

	// Calculate rankings per week
	const weeklyRankings = calculateWeeklyRankings(userCumulativePoints, availableWeeks, userMap);

	// Transform into user-centric format for charts
	const rankingHistory = transformToUserRankingHistory(
		userCumulativePoints,
		weeklyRankings,
		availableWeeks,
		userMap
	);

	return {
		rankingHistory,
		availableWeeks,
		currentWeek
	};
}

/**
 * Calculate rankings for each week based on cumulative points
 */
function calculateWeeklyRankings(
	userCumulativePoints: Map<string, Map<number, number>>,
	availableWeeks: number[],
	userMap: Map<string, string>
): WeeklyRanking[][] {
	const weeklyRankings: WeeklyRanking[][] = [];

	for (const weekId of availableWeeks) {
		const rankings: WeeklyRanking[] = [];

		for (const [userId, weeklyMap] of userCumulativePoints) {
			// Sum all points up to this week
			let cumulative = 0;
			for (const [wId, pts] of weeklyMap) {
				if (wId <= weekId) {
					cumulative += pts;
				}
			}

			rankings.push({
				weekId,
				userId,
				username: userMap.get(userId) || 'Unknown',
				cumulativePoints: cumulative,
				rank: 0 // Will be assigned after sorting
			});
		}

		// Sort by cumulative points (highest first) and assign ranks
		rankings.sort((a, b) => b.cumulativePoints - a.cumulativePoints);
		rankings.forEach((r, idx) => {
			r.rank = idx + 1;
		});

		weeklyRankings.push(rankings);
	}

	return weeklyRankings;
}

/**
 * Transform weekly rankings into user-centric format for chart visualization
 */
function transformToUserRankingHistory(
	userCumulativePoints: Map<string, Map<number, number>>,
	weeklyRankings: WeeklyRanking[][],
	availableWeeks: number[],
	userMap: Map<string, string>
): UserRankingHistory[] {
	const rankingHistory: UserRankingHistory[] = [];

	for (const [userId, _] of userCumulativePoints) {
		const userRankings: RankingPoint[] = [];

		for (let i = 0; i < availableWeeks.length; i++) {
			const weekRankings = weeklyRankings[i];
			const userRank = weekRankings.find((r) => r.userId === userId);
			if (userRank) {
				userRankings.push({
					weekId: availableWeeks[i],
					rank: userRank.rank,
					points: userRank.cumulativePoints
				});
			}
		}

		rankingHistory.push({
			userId,
			username: userMap.get(userId) || 'Unknown',
			color: CHART_COLORS[rankingHistory.length % CHART_COLORS.length],
			rankings: userRankings
		});
	}

	// Sort by latest rank (best first)
	rankingHistory.sort((a, b) => {
		const aLatest = a.rankings[a.rankings.length - 1]?.rank || 999;
		const bLatest = b.rankings[b.rankings.length - 1]?.rank || 999;
		return aLatest - bLatest;
	});

	return rankingHistory;
}
