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
 * Determines the current match week based on fixture data as the source of truth
 * @returns The current week number (1-38)
 */
export async function getCurrentWeek(): Promise<number> {
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

	// Use fixture data as the source of truth
	try {
		// Query ALL fixtures (not just SCHEDULED/TIMED - include FINISHED, IN_PLAY, PAUSED too)
		const allFixtures = await db
			.select({
				weekId: fixtures.weekId,
				status: fixtures.status
			})
			.from(fixtures)
			.where(
				drizzleInArray(fixtures.status, ['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED', 'FINISHED'])
			);

		if (allFixtures && allFixtures.length > 0) {
			// If any fixture is IN_PLAY or PAUSED, return that week (a match is happening right now)
			const liveFixture = allFixtures.find((f) => f.status === 'IN_PLAY' || f.status === 'PAUSED');
			if (liveFixture) {
				return Math.min(Math.max(liveFixture.weekId, 1), season.totalWeeks);
			}

			// Group fixtures by week to find completion status
			const weekStatuses = new Map<number, { finished: number; total: number }>();
			for (const fixture of allFixtures) {
				if (!weekStatuses.has(fixture.weekId)) {
					weekStatuses.set(fixture.weekId, { finished: 0, total: 0 });
				}
				const weekData = weekStatuses.get(fixture.weekId)!;
				weekData.total++;
				if (fixture.status === 'FINISHED') {
					weekData.finished++;
				}
			}

			// Find the highest weekId where ALL fixtures are FINISHED
			let highestCompletedWeek = 0;
			for (const [weekId, data] of weekStatuses.entries()) {
				// A week is complete if all its fixtures are finished
				if (data.finished === data.total && data.total > 0) {
					highestCompletedWeek = Math.max(highestCompletedWeek, weekId);
				}
			}

			// Current week is the next week after the highest completed week
			// If we have a mix of FINISHED and SCHEDULED/TIMED in a week, that's the current week
			const currentWeek = highestCompletedWeek + 1;

			// Clamp result to 1-38
			return Math.min(Math.max(currentWeek, 1), season.totalWeeks);
		}
	} catch (error) {
		// If the DB query fails, fall back to the linear calculation
		console.error('Error finding current week from fixtures:', error);
	}

	// Fall back to linear calculation only if fixture query fails
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
