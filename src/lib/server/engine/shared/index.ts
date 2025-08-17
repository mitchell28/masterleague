// Core engine calculation functions
export {
	recalculateLeaderboard,
	recalculateAllLeaderboards,
	getLeaderboard,
	type RecalculationResult
} from '../analytics/leaderboard.js';

export {
	updatePredictions,
	updatePredictionsForFixture,
	type PredictionUpdateResult
} from '../analytics/prediction-processor.js';

export { calculatePredictionPoints, getMatchOutcome, isValidPrediction } from './utils.js';

// Fixtures
export * from '../data/fixtures/index.js';

// Predictions
export * from '../data/predictions/index.js';

// Teams
export * from '../data/teams.js';
