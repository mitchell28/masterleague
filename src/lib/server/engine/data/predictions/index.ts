import { checkAndUpdateRecentFixtures, recoverMissedFixtures } from './fixtureUpdateService';
import { processPredictionsForFixture, getLeagueTable } from './predictionRepository';
import { submitPrediction } from './userPredictions';

export {
	// Fixture update functions
	checkAndUpdateRecentFixtures,
	recoverMissedFixtures,

	// Prediction functions
	processPredictionsForFixture,
	getLeagueTable,
	submitPrediction
};
