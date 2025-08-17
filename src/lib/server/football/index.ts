// Core football calculation functions
export {
	recalculateLeaderboard,
	recalculateAllLeaderboards,
	getLeaderboard,
	type RecalculationResult
} from './leaderboard.js';

export {
	updatePredictions,
	analyzePredictions,
	type PredictionUpdateResult
} from './prediction-processor.js';

export { calculatePredictionPoints, getMatchOutcome, isValidPrediction } from './utils.js';

// Fixtures
export * from './fixtures/index.js';

// Predictions
export * from './predictions/predictionRepository.js';

// Teams
export * from './teams.js';
