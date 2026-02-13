import { db } from '../../../db';
import { fixtures } from '../../../db/schema';
import { inArray as drizzleInArray } from 'drizzle-orm';

/**
 * Season configuration interface
 */
interface SeasonConfig {
	startDate: Date;
	endDate: Date;
	totalWeeks: number;
}

/**
 * Fixture result from database query
 */
interface FixtureResult {
	weekId: number;
	matchDate: Date | string;
}

// Constants for week calculation
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000; // Milliseconds in a week
const FIXTURE_LOOKAHEAD_DAYS = 14; // Days to look ahead for fixtures
const WEEK_TOLERANCE = 2; // Max weeks difference between calculated and fixture-based week

/**
 * Determines the current match week based on the fixture dates and schedule
 * @returns The current week number (1-38)
 */
export async function getCurrentWeek(): Promise<number> {
	// Use 2025-26 season dates (official Premier League dates)
	const season: SeasonConfig = {
		startDate: new Date('2025-08-15'), // Friday, 15 Aug 2025
		endDate: new Date('2026-05-24'), // Sunday, 24 May 2026
		totalWeeks: 38
	}; // Get current date
	const now: Date = new Date();

	// Handle pre-season: if we're before the season starts, return week 1
	// This prevents showing high week numbers from the previous season
	if (now < season.startDate) {
		return 1;
	}

	// Handle post-season dates
	if (now > season.endDate) return season.totalWeeks;

	// Calculate the week based on weeks elapsed since season start (primary method)
	// This is more accurate than percentage-based calculation as PL plays roughly one matchweek per week
	const elapsedMs: number = now.getTime() - season.startDate.getTime();
	const weeksElapsed: number = Math.floor(elapsedMs / MS_PER_WEEK);
	const calculatedWeek: number = Math.min(weeksElapsed + 1, season.totalWeeks);

	// Try to refine the week based on actual fixture data
	try {
		// Query the database to find the upcoming fixtures - using proper Drizzle query pattern
		const results = await db
			.select({
				weekId: fixtures.weekId,
				matchDate: fixtures.matchDate
			})
			.from(fixtures)
			.where(drizzleInArray(fixtures.status, ['SCHEDULED', 'TIMED']))
			.orderBy(fixtures.matchDate);

		if (results && results.length > 0) {
			// First try to find the current week by looking at fixtures happening today or in the near future
			const today: Date = new Date();
			today.setHours(0, 0, 0, 0);

			const tomorrow: Date = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const lookaheadDate: Date = new Date(today);
			lookaheadDate.setDate(lookaheadDate.getDate() + FIXTURE_LOOKAHEAD_DAYS);

			// Check for fixtures happening today or tomorrow first
			const imminent = results.find((fixture) => {
				const fixtureDate: Date = new Date(fixture.matchDate);
				return fixtureDate >= today && fixtureDate < tomorrow;
			});

			if (imminent) {
				return imminent.weekId;
			}

			// If no fixtures today/tomorrow, find closest upcoming fixture within lookahead window
			const upcoming = results.find((fixture) => {
				const fixtureDate: Date = new Date(fixture.matchDate);
				return fixtureDate >= today && fixtureDate <= lookaheadDate;
			});

			// Only use fixture-based week if it's within tolerance of calculated week
			// This prevents jumping to far-future weeks when there's a gap in fixtures
			if (upcoming && Math.abs(upcoming.weekId - calculatedWeek) <= WEEK_TOLERANCE) {
				return upcoming.weekId;
			}
		}
	} catch (error) {
		// If the DB query fails, fall back to the linear calculation
		console.error('Error finding current week from fixtures:', error);
	}

	// Use the date-based calculation as the authoritative answer
	// Ensure result is within valid range
	return Math.min(Math.max(calculatedWeek, 1), season.totalWeeks);
}

/**
 * Determines the leaderboard week - shows previous week until first match of current week starts
 * This is specifically for leaderboard display to give users time to see their previous week results
 * @returns The week number to display on leaderboard (1-38)
 */
export async function getLeaderboardWeek(): Promise<number> {
	// Use 2025-26 season dates (official Premier League dates)
	const season: SeasonConfig = {
		startDate: new Date('2025-08-15'), // Friday, 15 Aug 2025
		endDate: new Date('2026-05-24'), // Sunday, 24 May 2026
		totalWeeks: 38
	};

	const now: Date = new Date();

	// Handle pre-season: if we're before the season starts, return week 1
	if (now < season.startDate) {
		return 1;
	}

	// Handle post-season dates
	if (now > season.endDate) return season.totalWeeks;

	try {
		// Get current week first
		const currentWeek = await getCurrentWeek();

		// If we're in week 1, show week 1
		if (currentWeek <= 1) {
			return 1;
		}

		// Check if any fixtures for the current week have started
		const currentWeekFixtures = await db
			.select({
				weekId: fixtures.weekId,
				matchDate: fixtures.matchDate,
				status: fixtures.status
			})
			.from(fixtures)
			.where(
				drizzleInArray(fixtures.status, ['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED', 'FINISHED'])
			);

		// Filter for current week fixtures
		const currentWeekMatches = currentWeekFixtures.filter((f) => f.weekId === currentWeek);

		if (currentWeekMatches.length > 0) {
			// Check if any match in current week has started (IN_PLAY, PAUSED, or FINISHED)
			const hasStartedMatches = currentWeekMatches.some(
				(f) => f.status === 'IN_PLAY' || f.status === 'PAUSED' || f.status === 'FINISHED'
			);

			// If matches have started, show current week
			if (hasStartedMatches) {
				return currentWeek;
			}

			// If no matches have started yet, check if first match is about to start (within next hour)
			const now = new Date();
			const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

			const upcomingMatch = currentWeekMatches
				.filter((f) => f.status === 'SCHEDULED' || f.status === 'TIMED')
				.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())[0];

			if (upcomingMatch) {
				const matchDate = new Date(upcomingMatch.matchDate);
				// If first match starts within an hour, show current week
				if (matchDate <= oneHourFromNow) {
					return currentWeek;
				}
			}
		}

		// Default: show previous week until current week matches start
		return Math.max(currentWeek - 1, 1);
	} catch (error) {
		console.error('Error finding leaderboard week from fixtures:', error);
		// Fall back to getCurrentWeek on error
		return await getCurrentWeek();
	}
}

/**
 * Maps API status values to our database status values
 * @param apiStatus - The status string from the football API
 * @returns The corresponding status value for our database
 */
export function mapApiStatusToDbStatus(apiStatus: string): string {
	// API statuses: SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED
	// We're using the API status values directly now for consistency
	return apiStatus;
}
