import { db } from '../../db';
import * as schema from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';

// Track last update time to limit frequent calls
let lastUpdateTimestamp = 0;
const UPDATE_COOLDOWN = 2 * 60 * 1000; // 2 minute cooldown between updates
let lastLiveUpdateTimestamp = 0;
const LIVE_UPDATE_COOLDOWN = 30 * 1000; // 30 second cooldown for live matches

/**
 * Efficiently check and update fixtures that need attention, including:
 * - Live fixtures
 * - Recently completed fixtures
 * - Upcoming fixtures about to start
 * - Potentially missed fixtures that might have been overlooked
 *
 * This function ensures no fixtures are missed in points calculations.
 */
export async function checkAndUpdateRecentFixtures(forceCheck = false): Promise<{
	updated: number;
	live: number;
	recentlyCompleted: number;
	potentiallyMissed: number;
}> {
	try {
		// Check if we're within the cooldown period
		const now = new Date();
		const currentTime = now.getTime();

		// If not forced and an update was performed recently, perform a quicker check for live matches only
		if (!forceCheck && currentTime - lastUpdateTimestamp < UPDATE_COOLDOWN) {
			// For live matches, use a shorter cooldown
			if (currentTime - lastLiveUpdateTimestamp < LIVE_UPDATE_COOLDOWN) {
				console.log(
					`Skipping all updates - last live update was ${(currentTime - lastLiveUpdateTimestamp) / 1000} seconds ago`
				);
				return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
			}

			console.log(`Checking only live matches - bypassing main cooldown`);

			// Only check live matches more frequently
			const liveFixtures = await db
				.select()
				.from(schema.fixtures)
				.where(inArray(schema.fixtures.status, ['IN_PLAY', 'PAUSED']));

			if (liveFixtures.length === 0) {
				return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
			}

			// Update timestamp for live updates
			lastLiveUpdateTimestamp = currentTime;

			// Import the function to avoid circular dependency
			const { updateFixtureStatuses } = await import('../fixtures');

			// Only update live fixtures
			const liveFixtureIds = liveFixtures.map((fixture) => fixture.id);
			const result = await updateFixtureStatuses(liveFixtureIds);

			return {
				...result,
				recentlyCompleted: 0,
				potentiallyMissed: 0
			};
		}

		// Update timestamps before processing complete update
		lastUpdateTimestamp = currentTime;
		lastLiveUpdateTimestamp = currentTime;

		const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const twoHoursAhead = new Date(now.getTime() + 2 * 60 * 60 * 1000);
		const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

		// Find fixtures that need attention - use separate queries and post-filtering

		// Live fixtures - highest priority
		const liveFixtures = await db
			.select()
			.from(schema.fixtures)
			.where(inArray(schema.fixtures.status, ['IN_PLAY', 'PAUSED']));

		// Recently completed fixtures
		const finishedFixtures = await db
			.select()
			.from(schema.fixtures)
			.where(eq(schema.fixtures.status, 'FINISHED'));

		// Filter for recently completed (in last 24 hours)
		const recentlyCompletedFixtures = finishedFixtures.filter(
			(fixture) => fixture.lastUpdated && new Date(fixture.lastUpdated) >= oneDayAgo
		);

		// Filter for potentially missed fixtures (missing timestamps or scores)
		const potentiallyMissedFixtures = finishedFixtures.filter((fixture) => {
			// No lastUpdated timestamp
			if (!fixture.lastUpdated) return true;

			// Updated more than a day ago but within 3 days and missing scores
			if (
				new Date(fixture.lastUpdated) < oneDayAgo &&
				new Date(fixture.matchDate) > threeDaysAgo &&
				(fixture.homeScore === null || fixture.awayScore === null)
			) {
				return true;
			}

			return false;
		});

		// Upcoming fixtures
		const scheduledFixtures = await db
			.select()
			.from(schema.fixtures)
			.where(inArray(schema.fixtures.status, ['TIMED', 'SCHEDULED']));

		// Filter for fixtures about to start
		const upcomingFixtures = scheduledFixtures.filter(
			(fixture) => new Date(fixture.matchDate) <= twoHoursAhead
		);

		// Special statuses that need monitoring
		const specialStatusFixtures = await db
			.select()
			.from(schema.fixtures)
			.where(inArray(schema.fixtures.status, ['SUSPENDED', 'POSTPONED']));

		// Filter for recent special status fixtures
		const recentSpecialFixtures = specialStatusFixtures.filter(
			(fixture) => new Date(fixture.matchDate) >= threeDaysAgo
		);

		// Combine all fixtures that need attention
		const allFixturesToUpdate = [
			...liveFixtures,
			...recentlyCompletedFixtures,
			...potentiallyMissedFixtures,
			...upcomingFixtures,
			...recentSpecialFixtures
		];

		// If no fixtures need attention, return early
		if (allFixturesToUpdate.length === 0) {
			return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
		}

		// Remove duplicates using Set and fixture IDs
		const uniqueFixtureIds = [...new Set(allFixturesToUpdate.map((fixture) => fixture.id))];

		// Import the function to avoid circular dependency
		const { updateFixtureStatuses } = await import('../fixtures');

		// Use the updateFixtureStatuses function to do the actual updates
		const result = await updateFixtureStatuses(uniqueFixtureIds);

		return {
			...result,
			recentlyCompleted: recentlyCompletedFixtures.length,
			potentiallyMissed: potentiallyMissedFixtures.length
		};
	} catch (error) {
		console.error('Error in checkAndUpdateRecentFixtures:', error);
		return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
	}
}
