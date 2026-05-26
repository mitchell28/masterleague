/**
 * Central season configuration.
 * Update CURRENT_SEASON and CURRENT_SEASON_CONFIG here when migrating to a new season.
 */

export const CURRENT_SEASON = '2026-27';
export const PREVIOUS_SEASON = '2025-26';

export interface SeasonConfig {
	startDate: Date;
	endDate: Date;
	totalWeeks: number;
}

/** Official Premier League 2026/27 season dates */
export const CURRENT_SEASON_CONFIG: SeasonConfig = {
	startDate: new Date('2026-08-14'), // Friday, 14 Aug 2026
	endDate: new Date('2027-05-23'), // Sunday, 23 May 2027
	totalWeeks: 38
};

export type SeasonState = 'pre-season' | 'in-season' | 'post-season';

/**
 * Returns the current state relative to CURRENT_SEASON_CONFIG.
 * - 'pre-season'  : before the season starts (off-season gap, typical June–Aug)
 * - 'in-season'   : season is live
 * - 'post-season' : season has ended (should not normally occur; CURRENT_SEASON gets bumped)
 */
export function getSeasonState(now = new Date()): SeasonState {
	if (now < CURRENT_SEASON_CONFIG.startDate) return 'pre-season';
	if (now > CURRENT_SEASON_CONFIG.endDate) return 'post-season';
	return 'in-season';
}

/** Days until the next season kicks off. Returns 0 once the season has started. */
export function daysUntilSeasonStart(now = new Date()): number {
	const diff = CURRENT_SEASON_CONFIG.startDate.getTime() - now.getTime();
	return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
