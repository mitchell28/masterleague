/**
 * Shared analytics types for use in both server and client code
 */

/**
 * A single point in a user's ranking history
 */
export interface RankingPoint {
	weekId: number;
	rank: number;
	points: number;
}

/**
 * A user's complete ranking history across all weeks
 */
export interface UserRankingHistory {
	userId: string;
	username: string;
	color: string;
	rankings: RankingPoint[];
}

/**
 * Weekly ranking data for a single user in a specific week
 */
export interface WeeklyRanking {
	weekId: number;
	userId: string;
	username: string;
	cumulativePoints: number;
	rank: number;
}

/**
 * Raw weekly points data from database
 */
export interface WeeklyPointsData {
	userId: string;
	weekId: number;
	points: number;
}

/**
 * Chart color palette for ranking visualizations
 */
export const CHART_COLORS = [
	'oklch(88.266% 0.20737 155.248)', // accent green
	'oklch(70% 0.18 260)', // indigo
	'oklch(75% 0.15 30)', // orange
	'oklch(70% 0.20 330)', // pink
	'oklch(75% 0.15 200)', // cyan
	'oklch(70% 0.18 100)', // yellow-green
	'oklch(70% 0.15 280)', // purple
	'oklch(75% 0.12 60)', // gold
	'oklch(70% 0.18 180)', // teal
	'oklch(75% 0.15 350)' // red-pink
];

/**
 * Calculate the rank change for a user between their last two weeks
 * @returns Positive = improved (rank went down numerically), Negative = dropped
 */
export function getRankChange(user: UserRankingHistory): number {
	if (user.rankings.length < 2) return 0;
	const current = user.rankings[user.rankings.length - 1]?.rank || 0;
	const previous = user.rankings[user.rankings.length - 2]?.rank || 0;
	return previous - current; // Positive = improved (went up in rank)
}
