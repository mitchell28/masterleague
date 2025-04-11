// Re-export everything from the individual modules
import { getCurrentWeek, mapApiStatusToDbStatus } from './fixtureUtils';
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
	seedFixturesWithMatchId,
	updateFixtureStatuses,
	// Import types with the 'type' keyword to comply with verbatimModuleSyntax
	type ApiMatch,
	type ApiMatchTeam
} from './fixtureApi';

// Export everything
export {
	// Utils
	getCurrentWeek, // Now returns Promise<number> instead of number
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
	seedFixturesWithMatchId,
	updateFixtureStatuses
};

// Re-export types using 'export type' syntax for verbatimModuleSyntax compliance
export type { ApiMatch, ApiMatchTeam };
