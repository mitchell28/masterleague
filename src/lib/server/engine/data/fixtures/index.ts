// Re-export everything from the individual modules
import { getCurrentWeek, getLeaderboardWeek, mapApiStatusToDbStatus } from './fixtureUtils';
import {
	getFixturesByWeek,
	getFixtureById,
	updateFixtureResults,
	deleteFixturesByWeek,
	setRandomMultipliersForWeek,
	updateCurrentWeekMultipliers,
	updateAllWeekMultipliers
} from './fixtureRepository';
import {
	seedFixturesWithSeasonYear,
	updateFixtureStatuses,
	// Import types with the 'type' keyword to comply with verbatimModuleSyntax
	type ApiMatch,
	type ApiMatchTeam
} from './fixtureApi';
import {
	checkForLiveGamesOnPageVisit,
	triggerLiveScoreUpdate,
	getSmartPollingInterval,
	cacheLiveGameStatus,
	getCachedLiveGameStatus
} from './liveGameTriggers';

// Export everything
export {
	// Utils
	getCurrentWeek, // Now returns Promise<number> instead of number
	getLeaderboardWeek, // Shows previous week until current week matches start
	mapApiStatusToDbStatus,

	// DB operations
	getFixturesByWeek,
	getFixtureById,
	updateFixtureResults,
	deleteFixturesByWeek,
	setRandomMultipliersForWeek,
	updateCurrentWeekMultipliers,
	updateAllWeekMultipliers,

	// API operations
	seedFixturesWithSeasonYear,
	updateFixtureStatuses,

	// Live game triggers
	checkForLiveGamesOnPageVisit,
	triggerLiveScoreUpdate,
	getSmartPollingInterval,
	cacheLiveGameStatus,
	getCachedLiveGameStatus
};

// Re-export types using 'export type' syntax for verbatimModuleSyntax compliance
export type { ApiMatch, ApiMatchTeam };
