// Re-export everything from the individual modules
import {
	getUserPredictionsByWeek,
	getPredictionsForFixture,
	submitPrediction,
	processPredictionsForFixture,
	getLeagueTable
} from './predictionRepository';

import {
	calculatePredictionPoints,
	determineMatchOutcome,
	updateUserLeagueTable
} from './scoringEngine';

import { checkAndUpdateRecentFixtures } from './fixtureUpdateService';

// Export all functionality
export {
	// DB operations
	getUserPredictionsByWeek,
	getPredictionsForFixture,
	submitPrediction,
	processPredictionsForFixture,
	getLeagueTable,

	// Points calculations
	calculatePredictionPoints,
	determineMatchOutcome,
	updateUserLeagueTable,

	// Update functions
	checkAndUpdateRecentFixtures
};
