/**
 * Analytics Engine Module
 *
 * Centralized exports for all analytics-related functions and types.
 */

// Leaderboard calculations
export {
	recalculateLeaderboard,
	getLeaderboard,
	type LeaderboardEntry,
	type RecalculationResult
} from './leaderboard.js';

// Prediction processing
export {
	updatePredictions,
	updatePredictionsForFixture,
	processPredictionsForFixture,
	type PredictionUpdateResult
} from './prediction-processor.js';

// Weekly points breakdown
export {
	getWeeklyPointsByOrganization,
	getAvailableWeeks,
	buildWeeklyPointsMap,
	buildWeeklyBreakdownArray,
	calculateCumulativePoints,
	type WeeklyPointsData,
	type UserWeeklyBreakdown,
	type WeeklyPointsRow
} from './weekly-points.js';

// Ranking history for charts
export {
	getRankingHistory,
	getRankChange,
	CHART_COLORS,
	type UserRankingHistory,
	type RankingPoint,
	type WeeklyRanking,
	type RankingHistoryResult
} from './ranking-history.js';

// Real-time predictions
export { updatePredictionsRealtime } from './predictions-realtime-simple.js';
