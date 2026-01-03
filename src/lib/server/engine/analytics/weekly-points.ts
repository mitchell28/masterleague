/**
 * Weekly Points Analytics Module
 *
 * Provides functions for calculating and retrieving weekly points breakdowns
 * for users in an organization.
 */

import { db } from '$lib/server/db';
import { predictions, fixtures } from '$lib/server/db/schema';
import { eq, and, sum, sql, asc } from 'drizzle-orm';

/**
 * Type for weekly points breakdown
 */
export interface WeeklyPointsData {
	weekId: number;
	points: number;
	correctScorelines: number;
	correctOutcomes: number;
	totalPredictions: number;
}

/**
 * Type for user with weekly breakdown
 */
export interface UserWeeklyBreakdown {
	userId: string;
	username: string;
	totalPoints: number;
	weeklyBreakdown: WeeklyPointsData[];
}

/**
 * Raw weekly points row from database
 */
export interface WeeklyPointsRow {
	userId: string;
	weekId: number;
	points: string | number | null;
	correctScorelines: string | number;
	correctOutcomes: string | number;
	totalPredictions: string | number;
}

/**
 * Get all weekly points for an organization
 *
 * Returns aggregated points per user per week with breakdown of
 * correct scorelines vs correct outcomes.
 */
export async function getWeeklyPointsByOrganization(
	organizationId: string,
	season: string = '2025-26'
): Promise<WeeklyPointsRow[]> {
	const result = await db
		.select({
			userId: predictions.userId,
			weekId: fixtures.weekId,
			points: sum(predictions.points),
			// A correct scoreline gives 3 base points (with multiplier: 3, 6, 9, etc.)
			// A correct outcome gives 1 base point (with multiplier: 1, 2, etc. but not divisible by 3 unless it's also 3)
			correctScorelines: sql<number>`COUNT(CASE WHEN ${predictions.points} >= 3 AND ${predictions.points} % 3 = 0 THEN 1 END)`,
			correctOutcomes: sql<number>`COUNT(CASE WHEN ${predictions.points} > 0 AND (${predictions.points} < 3 OR ${predictions.points} % 3 != 0) THEN 1 END)`,
			totalPredictions: sql<number>`COUNT(*)`
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

	return result;
}

/**
 * Get available weeks with finished fixtures for an organization
 */
export async function getAvailableWeeks(
	organizationId: string,
	season: string = '2025-26',
	maxWeek?: number
): Promise<number[]> {
	const weeksData = await db
		.selectDistinct({ weekId: fixtures.weekId })
		.from(fixtures)
		.where(and(eq(fixtures.season, season), eq(fixtures.status, 'FINISHED')))
		.orderBy(asc(fixtures.weekId));

	let weeks = weeksData.map((w) => w.weekId);

	if (maxWeek !== undefined) {
		weeks = weeks.filter((w) => w <= maxWeek);
	}

	return weeks;
}

/**
 * Build a map of userId -> weekId -> WeeklyPointsData
 */
export function buildWeeklyPointsMap(
	weeklyPoints: WeeklyPointsRow[]
): Map<string, Map<number, WeeklyPointsData>> {
	const userWeeklyMap = new Map<string, Map<number, WeeklyPointsData>>();

	for (const row of weeklyPoints) {
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

	return userWeeklyMap;
}

/**
 * Calculate cumulative points up to a given week
 */
export function calculateCumulativePoints(
	weeklyBreakdown: WeeklyPointsData[],
	upToWeek: number
): { cumulativePoints: number; cumulativeCorrect: number } {
	let cumulativePoints = 0;
	let cumulativeCorrect = 0;

	for (const w of weeklyBreakdown) {
		if (w.weekId <= upToWeek) {
			cumulativePoints += w.points;
			cumulativeCorrect += w.correctScorelines;
		}
	}

	return { cumulativePoints, cumulativeCorrect };
}

/**
 * Build weekly breakdown array for a user
 */
export function buildWeeklyBreakdownArray(
	userWeeks: Map<number, WeeklyPointsData> | undefined,
	availableWeeks: number[]
): WeeklyPointsData[] {
	const breakdown: WeeklyPointsData[] = [];

	for (const weekId of availableWeeks) {
		const weekData = userWeeks?.get(weekId);
		breakdown.push({
			weekId,
			points: weekData?.points || 0,
			correctScorelines: weekData?.correctScorelines || 0,
			correctOutcomes: weekData?.correctOutcomes || 0,
			totalPredictions: weekData?.totalPredictions || 0
		});
	}

	return breakdown;
}
