import { db } from '../../db';
import { fixtures } from '../../db/schema';
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

	// First approach: Try to find the actual active week based on fixtures
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

			const nextWeek: Date = new Date(today);
			nextWeek.setDate(nextWeek.getDate() + 7);

			// Check for fixtures happening today or tomorrow first
			const imminent = results.find((fixture) => {
				const fixtureDate: Date = new Date(fixture.matchDate);
				return fixtureDate >= today && fixtureDate < tomorrow;
			});

			if (imminent) {
				return imminent.weekId;
			}

			// If no fixtures today/tomorrow, find closest upcoming fixture
			const upcoming = results.find((fixture) => {
				const fixtureDate: Date = new Date(fixture.matchDate);
				return fixtureDate >= today;
			});

			if (upcoming) {
				return upcoming.weekId;
			}
		}
	} catch (error) {
		// If the DB query fails, fall back to the linear calculation
		console.error('Error finding current week from fixtures:', error);
	}

	// Fall back to linear calculation if fixture-based approach fails
	const msPerDay: number = 24 * 60 * 60 * 1000;
	const totalDays: number = (season.endDate.getTime() - season.startDate.getTime()) / msPerDay;
	const elapsedDays: number = (now.getTime() - season.startDate.getTime()) / msPerDay;

	// Calculate match week based on percentage of season completed
	const matchWeek: number = Math.floor((elapsedDays / totalDays) * season.totalWeeks) + 1;

	// Ensure result is within valid range
	return Math.min(Math.max(matchWeek, 1), season.totalWeeks);
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
