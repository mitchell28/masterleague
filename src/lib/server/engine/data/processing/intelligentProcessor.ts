import { db } from '../../../db/index.js';
import { fixtures } from '../../../db/schema.js';
import { eq, and, gte } from 'drizzle-orm';

/**
 * Check when data was last updated by cron jobs vs manual triggers
 * This helps avoid duplicate processing when cron jobs are working well
 */
async function getDataFreshness(week?: number): Promise<{
	lastFixtureUpdate: Date | null;
	lastCronUpdate: Date | null;
	recentlyUpdatedFixtures: number;
	cronHealth: 'healthy' | 'stale' | 'unknown';
}> {
	try {
		// Get the most recent fixture update
		const recentFixtures = week
			? await db
					.select({
						lastUpdated: fixtures.lastUpdated,
						status: fixtures.status
					})
					.from(fixtures)
					.where(eq(fixtures.weekId, week))
					.orderBy(fixtures.lastUpdated)
					.limit(50)
			: await db
					.select({
						lastUpdated: fixtures.lastUpdated,
						status: fixtures.status
					})
					.from(fixtures)
					.orderBy(fixtures.lastUpdated)
					.limit(50);

		if (!recentFixtures.length) {
			return {
				lastFixtureUpdate: null,
				lastCronUpdate: null,
				recentlyUpdatedFixtures: 0,
				cronHealth: 'unknown'
			};
		}

		// Find the most recent update
		const lastFixtureUpdate = recentFixtures.reduce(
			(latest, fixture) => {
				const fixtureDate = fixture.lastUpdated ? new Date(fixture.lastUpdated) : null;
				if (!fixtureDate) return latest;
				return !latest || fixtureDate > latest ? fixtureDate : latest;
			},
			null as Date | null
		);

		// Count fixtures updated in the last 10 minutes (likely by cron)
		const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
		const recentlyUpdatedFixtures = recentFixtures.filter(
			(f) => f.lastUpdated && new Date(f.lastUpdated) > tenMinutesAgo
		).length;

		// Estimate last cron update (if multiple fixtures updated recently)
		const lastCronUpdate = recentlyUpdatedFixtures >= 3 ? lastFixtureUpdate : null;

		// Determine cron health based on update patterns
		let cronHealth: 'healthy' | 'stale' | 'unknown' = 'unknown';
		if (lastCronUpdate) {
			const timeSinceCron = Date.now() - lastCronUpdate.getTime();
			cronHealth = timeSinceCron < 15 * 60 * 1000 ? 'healthy' : 'stale'; // 15 min threshold
		}

		return {
			lastFixtureUpdate,
			lastCronUpdate,
			recentlyUpdatedFixtures,
			cronHealth
		};
	} catch (error) {
		console.error('Error checking data freshness:', error);
		return {
			lastFixtureUpdate: null,
			lastCronUpdate: null,
			recentlyUpdatedFixtures: 0,
			cronHealth: 'unknown'
		};
	}
}

/**
 * Intelligent processing decision for predictions data
 * Works with cron jobs to minimize unnecessary processing
 */
export async function intelligentPredictionsProcessing(
	fixtures: any[],
	lastUpdated: Date | null,
	currentWeek: number,
	week: number
): Promise<{
	shouldProcess: boolean;
	reason: string;
	isUrgent: boolean;
	method: 'sync' | 'background' | 'none';
}> {
	const now = new Date();
	const currentTime = now.getTime();

	// Check data freshness from database
	const dataFreshness = await getDataFreshness(week);

	// If no fixtures for this week, no processing needed
	if (!fixtures || fixtures.length === 0) {
		return { shouldProcess: false, reason: 'no-fixtures', isUrgent: false, method: 'none' };
	}

	// If cron just updated data (within last 5 minutes), skip processing
	if (dataFreshness.lastCronUpdate) {
		const timeSinceCron = currentTime - dataFreshness.lastCronUpdate.getTime();
		if (timeSinceCron < 5 * 60 * 1000) {
			// 5 minutes
			return {
				shouldProcess: false,
				reason: `cron-fresh-${Math.round(timeSinceCron / 60000)}min`,
				isUrgent: false,
				method: 'none'
			};
		}
	}

	// Check if any games are currently live
	const liveGames = fixtures.filter(
		(f) => f.status === 'IN_PLAY' || f.status === 'PAUSED' // Half-time or other pauses during live games
	);

	// Check if any games just finished (within last 30 minutes)
	const recentlyFinished = fixtures.filter((f) => {
		if (f.status !== 'FINISHED') return false;
		if (!f.kickoffTime) return false;
		const kickoff = new Date(f.kickoffTime);
		const estimatedEndTime = new Date(kickoff.getTime() + 2 * 60 * 60 * 1000); // 2 hours after kickoff
		return currentTime - estimatedEndTime.getTime() < 30 * 60 * 1000; // Within 30 mins of finish
	});

	// Check if any games are starting soon (within next 15 minutes)
	const startingSoon = fixtures.filter((f) => {
		if (!f.kickoffTime) return false;
		const kickoff = new Date(f.kickoffTime);
		const timeToKickoff = kickoff.getTime() - currentTime;
		return timeToKickoff > 0 && timeToKickoff < 15 * 60 * 1000; // Starting in next 15 mins
	});

	// URGENT: Live games need immediate sync processing
	if (liveGames.length > 0) {
		// But check if data was very recently updated
		if (dataFreshness.lastFixtureUpdate) {
			const timeSinceUpdate = currentTime - dataFreshness.lastFixtureUpdate.getTime();
			if (timeSinceUpdate < 2 * 60 * 1000) {
				// Updated within 2 minutes
				return {
					shouldProcess: false,
					reason: `live-but-fresh-${Math.round(timeSinceUpdate / 60000)}min`,
					isUrgent: false,
					method: 'none'
				};
			}
		}
		return {
			shouldProcess: true,
			reason: `live-games-${liveGames.length}`,
			isUrgent: true,
			method: 'sync'
		};
	}

	// URGENT: Recently finished games need sync processing for final scores
	if (recentlyFinished.length > 0) {
		// Check if these specific games were recently updated
		if (dataFreshness.lastFixtureUpdate) {
			const timeSinceUpdate = currentTime - dataFreshness.lastFixtureUpdate.getTime();
			if (timeSinceUpdate < 10 * 60 * 1000) {
				// Updated within 10 minutes
				return {
					shouldProcess: false,
					reason: `finished-but-fresh-${Math.round(timeSinceUpdate / 60000)}min`,
					isUrgent: false,
					method: 'none'
				};
			}
		}
		return {
			shouldProcess: true,
			reason: `recently-finished-${recentlyFinished.length}`,
			isUrgent: true,
			method: 'sync'
		};
	}

	// Background processing for games starting soon
	if (startingSoon.length > 0) {
		return {
			shouldProcess: true,
			reason: `starting-soon-${startingSoon.length}`,
			isUrgent: false,
			method: 'background'
		};
	}

	// For current week during active periods, check more frequently
	if (week === currentWeek) {
		const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
		const hour = now.getHours();

		// Weekend match days (Fri-Mon) or evening kickoffs (6pm-11pm)
		const isMatchDay = dayOfWeek >= 5 || dayOfWeek <= 1 || (hour >= 18 && hour <= 23);

		if (isMatchDay) {
			// During match periods, data should be fresher (within 15 minutes)
			const staleThreshold = 15 * 60 * 1000; // 15 minutes
			if (
				!dataFreshness.lastFixtureUpdate ||
				currentTime - dataFreshness.lastFixtureUpdate.getTime() > staleThreshold
			) {
				return {
					shouldProcess: true,
					reason: 'match-day-stale',
					isUrgent: false,
					method: 'background'
				};
			}
		}
	}

	// For past weeks, rarely need updates unless very stale
	if (week < currentWeek) {
		const veryStaleThreshold = 24 * 60 * 60 * 1000; // 24 hours
		if (
			!dataFreshness.lastFixtureUpdate ||
			currentTime - dataFreshness.lastFixtureUpdate.getTime() > veryStaleThreshold
		) {
			return {
				shouldProcess: true,
				reason: 'past-week-very-stale',
				isUrgent: false,
				method: 'background'
			};
		}
		return { shouldProcess: false, reason: 'past-week-cached', isUrgent: false, method: 'none' };
	}

	// For future weeks, check if data is stale
	if (week > currentWeek) {
		const staleThreshold = 4 * 60 * 60 * 1000; // 4 hours
		if (
			!dataFreshness.lastFixtureUpdate ||
			currentTime - dataFreshness.lastFixtureUpdate.getTime() > staleThreshold
		) {
			return {
				shouldProcess: true,
				reason: 'future-week-stale',
				isUrgent: false,
				method: 'background'
			};
		}
	}

	// Default: no processing needed, rely on cron jobs
	return { shouldProcess: false, reason: 'cron-sufficient', isUrgent: false, method: 'none' };
}

/**
 * Intelligent processing decision for leaderboard data
 * Works with cron jobs and considers leaderboard-specific timing
 */
export async function intelligentLeaderboardProcessing(
	leaderboardMeta: any,
	currentWeek: number
): Promise<{ shouldRefresh: boolean; reason: string; isUrgent: boolean }> {
	const now = new Date();
	const currentTime = now.getTime();

	// Check recent fixture activity to inform leaderboard refresh needs
	const dataFreshness = await getDataFreshness();

	// If no meta data, refresh needed
	if (!leaderboardMeta || !leaderboardMeta.lastUpdated) {
		return { shouldRefresh: true, reason: 'no-meta', isUrgent: false };
	}

	const lastUpdated = new Date(leaderboardMeta.lastUpdated);
	const timeSinceUpdate = currentTime - lastUpdated.getTime();

	// If cron recently updated fixtures (within 10 minutes), trigger leaderboard refresh
	if (dataFreshness.lastCronUpdate) {
		const timeSinceCron = currentTime - dataFreshness.lastCronUpdate.getTime();
		if (timeSinceCron < 10 * 60 * 1000 && timeSinceUpdate > 5 * 60 * 1000) {
			return { shouldRefresh: true, reason: 'post-cron-refresh', isUrgent: false };
		}
	}

	// If multiple fixtures were recently updated, leaderboard likely needs refresh
	if (dataFreshness.recentlyUpdatedFixtures >= 3 && timeSinceUpdate > 5 * 60 * 1000) {
		return { shouldRefresh: true, reason: 'multiple-fixtures-updated', isUrgent: false };
	}

	// Check if cron jobs are working well
	if (dataFreshness.cronHealth === 'healthy' && timeSinceUpdate < 30 * 60 * 1000) {
		return { shouldRefresh: false, reason: 'cron-healthy-recent', isUrgent: false };
	}

	// If cron is stale, be more aggressive about refreshing
	if (dataFreshness.cronHealth === 'stale') {
		const staleThreshold = 20 * 60 * 1000; // 20 minutes when cron is unhealthy
		if (timeSinceUpdate > staleThreshold) {
			return { shouldRefresh: true, reason: 'cron-stale-fallback', isUrgent: false };
		}
	}

	const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
	const hour = now.getHours();

	// During peak times (weekends, evenings), be more aggressive
	const isPeakTime = dayOfWeek >= 5 || dayOfWeek <= 1 || (hour >= 18 && hour <= 23);

	if (isPeakTime) {
		// During peak times, refresh more frequently
		const peakThreshold = 15 * 60 * 1000; // 15 minutes during peak
		if (timeSinceUpdate > peakThreshold) {
			return { shouldRefresh: true, reason: 'peak-time-stale', isUrgent: false };
		}
	} else {
		// During off-peak, rely more on cron jobs
		const offPeakThreshold = 45 * 60 * 1000; // 45 minutes during off-peak
		if (timeSinceUpdate > offPeakThreshold) {
			return { shouldRefresh: true, reason: 'off-peak-stale', isUrgent: false };
		}
	}

	// Default: use cached data
	return { shouldRefresh: false, reason: 'cache-fresh', isUrgent: false };
}

/**
 * Trigger background processing if needed (non-blocking)
 */
export async function triggerBackgroundProcessing(
	action: 'update-predictions' | 'refresh-leaderboard' | 'check-fixture-schedules',
	options?: {
		organizationId?: string;
		season?: string;
		fetch?: typeof fetch; // Allow passing SvelteKit's event.fetch
	}
): Promise<void> {
	try {
		const body: any = { action };
		if (options?.organizationId) body.organizationId = options.organizationId;
		if (options?.season) body.season = options.season;

		// Use provided fetch function (for SvelteKit server context) or global fetch
		const fetchFn = options?.fetch || fetch;

		// Make the background API call
		fetchFn('/api/cron/background', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		})
			.then(async (response) => {
				if (response.ok) {
					console.log(`✅ Background ${action} trigger sent successfully`);
				} else {
					const errorText = await response.text().catch(() => 'Unknown error');
					console.log(`⚠️ Background ${action} trigger failed: ${response.status} ${errorText}`);
				}
			})
			.catch((error) => {
				console.log(`❌ Background ${action} trigger error:`, error);
			});
	} catch (err) {
		console.log(`❌ Could not trigger background ${action}:`, err);
	}
}
