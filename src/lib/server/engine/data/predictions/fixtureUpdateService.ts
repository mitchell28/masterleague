import { db } from '../../../db';
import * as schema from '../../../db/schema';
import { eq, inArray, lt, gt, and, isNull, or, sql, between, isNotNull } from 'drizzle-orm';
import type { Fixture } from '../../../db/schema';

// More conservative cooldowns to reduce API calls
const UPDATE_COOLDOWN = 5 * 60 * 1000; // 5 minutes between full updates
const LIVE_UPDATE_COOLDOWN = 30 * 1000; // 30 seconds for live matches

// Track last update time to limit frequent calls
let lastUpdateTimestamp = 0;
let lastLiveUpdateTimestamp = 0;

// Cache fixture update counts to avoid redundant processing
let cachedFixtureUpdateResult: FixtureUpdateResult | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // Cache results for 1 minute

/**
 * Result interface for fixture update operations
 */
interface FixtureUpdateResult {
	updated: number;
	live: number;
	recentlyCompleted: number;
	potentiallyMissed: number;
}

/**
 * Result interface for recovery operations
 */
interface RecoveryResult {
	scanned: number;
	updated: number;
	reprocessedPredictions: number;
}

/**
 * Pre-check if updates are needed without making API calls
 * This provides a very fast response to skip unnecessary update attempts
 */
async function areFixtureUpdatesNeeded(): Promise<boolean> {
	const now = new Date();

	// Check for live matches first (highest priority)
	const liveFixturesCount = await db
		.select({ count: sql`count(*)` })
		.from(schema.fixtures)
		.where(inArray(schema.fixtures.status, ['IN_PLAY', 'PAUSED']))
		.then((result) => Number(result[0]?.count || 0));

	if (liveFixturesCount > 0) {
		return true;
	}

	// Check for matches about to start in the next hour
	const oneHourAhead = new Date(now.getTime() + 1 * 60 * 60 * 1000);
	const upcomingMatchesCount = await db
		.select({ count: sql`count(*)` })
		.from(schema.fixtures)
		.where(
			and(
				inArray(schema.fixtures.status, ['SCHEDULED', 'TIMED']),
				between(schema.fixtures.matchDate, now, oneHourAhead)
			)
		)
		.then((result) => Number(result[0]?.count || 0));

	if (upcomingMatchesCount > 0) {
		return true;
	}

	// Check for recently finished matches without lastUpdated timestamp
	const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
	const recentFinishedCount = await db
		.select({ count: sql`count(*)` })
		.from(schema.fixtures)
		.where(
			and(
				eq(schema.fixtures.status, 'FINISHED'),
				isNull(schema.fixtures.lastUpdated),
				gt(schema.fixtures.matchDate, sixHoursAgo)
			)
		)
		.then((result) => Number(result[0]?.count || 0));

	return recentFinishedCount > 0;
}

/**
 * Efficiently check and update fixtures that need attention, including:
 * - Live fixtures
 * - Recently completed fixtures
 * - Upcoming fixtures about to start
 * - Potentially missed fixtures that might have been overlooked
 *
 * This function ensures no fixtures are missed in points calculations.
 */
export async function checkAndUpdateRecentFixtures(
	forceCheck = false
): Promise<FixtureUpdateResult> {
	try {
		const now = new Date();
		const currentTime = now.getTime();

		// Return cached result if available and not forced
		if (!forceCheck && cachedFixtureUpdateResult && currentTime - cacheTimestamp < CACHE_TTL) {
			return cachedFixtureUpdateResult;
		}

		// For live matches, use a shorter cooldown unless forced
		if (!forceCheck && currentTime - lastUpdateTimestamp < UPDATE_COOLDOWN) {
			// Only check live matches more frequently
			if (currentTime - lastLiveUpdateTimestamp < LIVE_UPDATE_COOLDOWN) {
				console.log('Skipping updates - within cooldown period');
				return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
			}

			// Fast check if updates are actually needed
			const updatesNeeded = await areFixtureUpdatesNeeded();
			if (!updatesNeeded) {
				console.log('No fixture updates needed at this time');
				return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
			}

			console.log('Checking only live matches - bypassing main cooldown');

			const liveFixtures: Fixture[] = await db
				.select()
				.from(schema.fixtures)
				.where(inArray(schema.fixtures.status, ['IN_PLAY', 'PAUSED']));

			if (liveFixtures.length === 0) {
				return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
			}

			lastLiveUpdateTimestamp = currentTime;

			const { updateFixtureStatuses } = await import('../fixtures');
			const liveFixtureIds = liveFixtures.map((fixture) => fixture.id);
			const result = await updateFixtureStatuses(liveFixtureIds);

			// Cache the result
			const updateResult = {
				updated: result.updated,
				live: result.live,
				recentlyCompleted: 0,
				potentiallyMissed: 0
			};

			cachedFixtureUpdateResult = updateResult;
			cacheTimestamp = currentTime;

			return updateResult;
		}

		// Fast check if updates are actually needed
		if (!forceCheck) {
			const updatesNeeded = await areFixtureUpdatesNeeded();
			if (!updatesNeeded) {
				console.log('No fixture updates needed at this time');
				return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
			}
		}

		// Update timestamps for full update
		lastUpdateTimestamp = currentTime;
		lastLiveUpdateTimestamp = currentTime;

		// Define time windows for queries - more focused windows to reduce scope
		const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
		const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
		const oneHourAhead = new Date(now.getTime() + 1 * 60 * 60 * 1000);

		// Find fixtures that need attention with optimized queries

		// 1. Live fixtures - highest priority
		const liveFixtures: Fixture[] = await db
			.select()
			.from(schema.fixtures)
			.where(inArray(schema.fixtures.status, ['IN_PLAY', 'PAUSED']));

		// 2. Recently completed fixtures that might need score updates
		const recentlyCompletedFixtures: Fixture[] = await db
			.select()
			.from(schema.fixtures)
			.where(
				and(
					eq(schema.fixtures.status, 'FINISHED'),
					or(isNull(schema.fixtures.lastUpdated), lt(schema.fixtures.lastUpdated, sixHoursAgo)),
					gt(schema.fixtures.matchDate, twoDaysAgo)
				)
			)
			.limit(20); // Reduced limit

		// 3. Potentially missed fixtures (only check very recent ones most of the time)
		const potentiallyMissedFixtures: Fixture[] = await db
			.select()
			.from(schema.fixtures)
			.where(
				and(
					inArray(schema.fixtures.status, ['SCHEDULED', 'TIMED']), // Include TIMED fixtures
					lt(schema.fixtures.matchDate, sixHoursAgo),
					gt(schema.fixtures.matchDate, twoDaysAgo)
				)
			)
			.limit(20); // Reduced limit

		// 4. Upcoming fixtures about to start
		const upcomingFixtures: Fixture[] = await db
			.select()
			.from(schema.fixtures)
			.where(
				and(
					inArray(schema.fixtures.status, ['SCHEDULED', 'TIMED']),
					between(schema.fixtures.matchDate, now, oneHourAhead)
				)
			)
			.limit(15); // Reduced limit

		// Combine all fixtures that need attention, removing duplicates
		const fixtureMap = new Map<string, Fixture>();

		[
			...liveFixtures,
			...recentlyCompletedFixtures,
			...potentiallyMissedFixtures,
			...upcomingFixtures
		].forEach((fixture) => {
			if (!fixtureMap.has(fixture.id)) {
				fixtureMap.set(fixture.id, fixture);
			}
		});

		const allFixturesToUpdate = Array.from(fixtureMap.values());

		if (allFixturesToUpdate.length === 0) {
			// Cache the empty result
			cachedFixtureUpdateResult = {
				updated: 0,
				live: 0,
				recentlyCompleted: 0,
				potentiallyMissed: 0
			};
			cacheTimestamp = currentTime;
			return cachedFixtureUpdateResult;
		}

		console.log(
			`Updating ${allFixturesToUpdate.length} fixtures: ${liveFixtures.length} live, ${recentlyCompletedFixtures.length} recent, ${potentiallyMissedFixtures.length} missed, ${upcomingFixtures.length} upcoming`
		);

		// Use the updateFixtureStatuses function to do the actual updates
		const { updateFixtureStatuses } = await import('../fixtures');
		const uniqueFixtureIds = allFixturesToUpdate.map((fixture) => fixture.id);
		const result = await updateFixtureStatuses(uniqueFixtureIds);

		// Cache the result
		const updateResult = {
			updated: result.updated,
			live: result.live,
			recentlyCompleted: recentlyCompletedFixtures.length,
			potentiallyMissed: potentiallyMissedFixtures.length
		};

		cachedFixtureUpdateResult = updateResult;
		cacheTimestamp = currentTime;

		return updateResult;
	} catch (error) {
		console.error('Error in checkAndUpdateRecentFixtures:', error);
		return { updated: 0, live: 0, recentlyCompleted: 0, potentiallyMissed: 0 };
	}
}

/**
 * Deep scan for fixtures that might have been missed in regular updates
 * This function can be called from admin screens or as a scheduled task
 */
export async function recoverMissedFixtures(): Promise<RecoveryResult> {
	try {
		const now = new Date();
		const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

		// 1. First priority: Find FINISHED fixtures with missing scores
		const fixturesWithMissingScores: Fixture[] = await db
			.select()
			.from(schema.fixtures)
			.where(
				and(
					eq(schema.fixtures.status, 'FINISHED'),
					or(isNull(schema.fixtures.homeScore), isNull(schema.fixtures.awayScore)),
					gt(schema.fixtures.matchDate, fourteenDaysAgo) // Look back up to 14 days
				)
			);

		// 2. Second priority: Find fixtures with suspicious statuses (should be finished but aren't)
		const suspiciousFixtures: Fixture[] = await db
			.select()
			.from(schema.fixtures)
			.where(
				and(
					lt(schema.fixtures.matchDate, threeDaysAgo),
					gt(schema.fixtures.matchDate, sevenDaysAgo),
					or(
						inArray(schema.fixtures.status, ['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED']),
						isNull(schema.fixtures.homeScore),
						isNull(schema.fixtures.awayScore)
					)
				)
			);

		// 3. Third priority: Find old "live" fixtures that may be stuck
		const stuckLiveFixtures: Fixture[] = await db
			.select()
			.from(schema.fixtures)
			.where(
				and(
					inArray(schema.fixtures.status, ['IN_PLAY', 'PAUSED']),
					lt(schema.fixtures.matchDate, threeDaysAgo),
					gt(schema.fixtures.matchDate, fourteenDaysAgo)
				)
			);

		if (
			fixturesWithMissingScores.length === 0 &&
			suspiciousFixtures.length === 0 &&
			stuckLiveFixtures.length === 0
		) {
			return { scanned: 0, updated: 0, reprocessedPredictions: 0 };
		}

		// Log what we found
		if (fixturesWithMissingScores.length > 0) {
			console.log(
				`Found ${fixturesWithMissingScores.length} FINISHED fixtures with missing scores`
			);
			fixturesWithMissingScores.forEach((fixture) => {
				console.log(
					`- Fixture ${fixture.id}: Match date ${fixture.matchDate}, Status: ${fixture.status}, Scores: ${fixture.homeScore}-${fixture.awayScore}, Match ID: ${fixture.matchId || 'MISSING'}`
				);
			});
		}

		if (suspiciousFixtures.length > 0) {
			console.log(
				`Found ${suspiciousFixtures.length} suspicious fixtures that should be completed by now`
			);
			suspiciousFixtures.forEach((fixture) => {
				console.log(
					`- Fixture ${fixture.id}: Match date ${fixture.matchDate}, Status: ${fixture.status}, Match ID: ${fixture.matchId || 'MISSING'}`
				);
			});
		}

		if (stuckLiveFixtures.length > 0) {
			console.log(
				`Found ${stuckLiveFixtures.length} fixtures that appear to be stuck in live status`
			);
			stuckLiveFixtures.forEach((fixture) => {
				console.log(
					`- Fixture ${fixture.id}: Match date ${fixture.matchDate}, Status: ${fixture.status}, Match ID: ${fixture.matchId || 'MISSING'}`
				);
			});
		}

		// Combine all fixtures that need updates - filter out any fixtures without matchId as they can't be updated
		const allFixtures = [
			...fixturesWithMissingScores,
			...suspiciousFixtures,
			...stuckLiveFixtures
		].filter((fixture) => !!fixture.matchId);

		// Get unique fixture IDs
		const uniqueFixtureIds = [...new Set(allFixtures.map((fixture) => fixture.id))];

		if (uniqueFixtureIds.length === 0) {
			console.log('No fixtures with valid matchId found to update');
			return { scanned: allFixtures.length, updated: 0, reprocessedPredictions: 0 };
		}

		console.log(`Updating ${uniqueFixtureIds.length} fixtures with valid matchId...`);

		// Update these fixtures, forcing a deeper check
		const { updateFixtureStatuses } = await import('../fixtures');
		const result = await updateFixtureStatuses(uniqueFixtureIds);

		// Find predictions associated with updated fixtures that have null points
		const updatedPredictions = await db
			.select({
				count: sql`count(*)`
			})
			.from(schema.predictions)
			.where(
				and(
					inArray(schema.predictions.fixtureId, uniqueFixtureIds),
					isNull(schema.predictions.points)
				)
			);

		const count = Number(updatedPredictions[0]?.count || 0);

		// Reprocess predictions for these fixtures if needed
		if (count > 0) {
			console.log(`Reprocessing ${count} predictions with null points`);

			// Process updated fixtures that are now FINISHED and have scores
			const updatedFixtures = await db
				.select()
				.from(schema.fixtures)
				.where(
					and(
						inArray(schema.fixtures.id, uniqueFixtureIds),
						eq(schema.fixtures.status, 'FINISHED'),
						isNotNull(schema.fixtures.homeScore),
						isNotNull(schema.fixtures.awayScore)
					)
				);

			for (const fixture of updatedFixtures) {
				if (fixture.homeScore !== null && fixture.awayScore !== null) {
					try {
						const { processPredictionsForFixture } = await import('./predictionRepository');
						const processResult = await processPredictionsForFixture(
							fixture.id,
							fixture.homeScore,
							fixture.awayScore
						);
						console.log(
							`Processed fixture ${fixture.id}: ${processResult.processed} predictions, ${processResult.pointsAllocated} points allocated`
						);
					} catch (error) {
						console.error(`Error reprocessing predictions for fixture ${fixture.id}:`, error);
					}
				}
			}
		}

		return {
			scanned: allFixtures.length,
			updated: result.updated,
			reprocessedPredictions: count
		};
	} catch (error) {
		console.error('Error in recoverMissedFixtures:', error);
		return { scanned: 0, updated: 0, reprocessedPredictions: 0 };
	}
}
