import { cache, CacheKeys } from '$lib/server/cache/simple-cache.js';

/**
 * Smart live game detection and triggering utilities
 * Used on predictions page visits to trigger live score updates
 */

interface LiveGameTriggerResult {
	hasLiveGames: boolean;
	shouldTriggerUpdate: boolean;
	liveFixtureIds: string[];
	reason: string;
	nextCheckIn: number; // milliseconds
}

/**
 * Simple helper to check if a fixture should be live based on time
 * Kickoff + 0 to 120 minutes = potentially live
 */
function shouldFixtureBePlayingNow(fixture: any): boolean {
	const now = new Date();
	const matchTime = new Date(fixture.matchDate);
	const minutesSinceKickoff = (now.getTime() - matchTime.getTime()) / (1000 * 60);

	// Game should be playing if it's 0-120 minutes after kickoff
	return minutesSinceKickoff >= 0 && minutesSinceKickoff <= 120;
}

/**
 * Enhanced check for live games - includes time-based detection
 * Called from predictions page server load
 */
export async function checkForLiveGamesOnPageVisit(
	fixtures: any[]
): Promise<LiveGameTriggerResult> {
	const now = new Date();

	// Find fixtures marked as live in DB
	const dbLiveFixtures = fixtures.filter((fixture) =>
		['IN_PLAY', 'PAUSED'].includes(fixture.status)
	);

	// Find fixtures that should be playing based on time but aren't marked as live
	const timeLiveFixtures = fixtures.filter(
		(fixture) =>
			shouldFixtureBePlayingNow(fixture) &&
			!['IN_PLAY', 'PAUSED', 'FINISHED'].includes(fixture.status)
	);

	// Combine both types
	const allLiveFixtures = [...dbLiveFixtures, ...timeLiveFixtures];
	const hasAnyLiveGames = allLiveFixtures.length > 0;

	if (!hasAnyLiveGames) {
		return {
			hasLiveGames: false,
			shouldTriggerUpdate: false,
			liveFixtureIds: [],
			reason: 'no-live-games',
			nextCheckIn: 300000 // 5 minutes
		};
	}

	console.log(
		`⚽ Found ${dbLiveFixtures.length} DB live + ${timeLiveFixtures.length} time-based live games`
	);

	// Check if live scores were updated recently
	const lastLiveUpdate = cache.getAge(CacheKeys.cronJob('live-scores-updater'));

	// Trigger if:
	// 1. No update in 2+ minutes for DB live games
	// 2. OR we found time-based live games (DB might be outdated)
	const shouldTrigger =
		lastLiveUpdate === null || lastLiveUpdate > 2 || timeLiveFixtures.length > 0;

	return {
		hasLiveGames: true,
		shouldTriggerUpdate: shouldTrigger,
		liveFixtureIds: allLiveFixtures.map((f) => f.id),
		reason:
			timeLiveFixtures.length > 0
				? `found-${timeLiveFixtures.length}-games-should-be-live`
				: shouldTrigger
					? `live-games-need-update-${lastLiveUpdate || 'never'}min`
					: `live-games-fresh-${lastLiveUpdate}min`,
		nextCheckIn: 30000 // 30 seconds for live games
	};
}

/**
 * Trigger live score update with urgent priority
 * Called when live games are detected on page visit
 */
export async function triggerLiveScoreUpdate(fetch): Promise<boolean> {
	try {
		console.log('🚀 Triggering urgent live score update from page visit');

		const response = await fetch('/api/cron/live-scores-updater', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				priority: 'urgent',
				force: false // Respect rate limiting
			})
		});

		if (response.ok) {
			const result = await response.json();
			console.log(`✅ Live score update triggered: ${result.message}`);
			return true;
		} else {
			console.warn(`⚠️ Live score update failed: ${response.statusText}`);
			return false;
		}
	} catch (error) {
		console.error('❌ Failed to trigger live score update:', error);
		return false;
	}
}

/**
 * Get smart polling interval based on live game status
 * Used by frontend for intelligent polling
 */
export function getSmartPollingInterval(hasLiveGames: boolean, lastUpdate: number | null): number {
	if (!hasLiveGames) {
		return 300000; // 5 minutes when no live games
	}

	// For live games, use dynamic intervals based on last update
	if (lastUpdate === null || lastUpdate > 5) {
		return 15000; // 15 seconds if no recent update
	} else if (lastUpdate > 2) {
		return 30000; // 30 seconds if somewhat recent
	} else {
		return 60000; // 1 minute if very recent
	}
}

/**
 * Cache live game status for quick access
 */
export function cacheLiveGameStatus(fixtures: any[]): void {
	const liveFixtures = fixtures.filter((f) => ['IN_PLAY', 'PAUSED'].includes(f.status));

	cache.set(
		'live-games-status',
		{
			hasLiveGames: liveFixtures.length > 0,
			liveCount: liveFixtures.length,
			liveFixtureIds: liveFixtures.map((f) => f.id),
			lastChecked: new Date().toISOString()
		},
		2
	); // Cache for 2 minutes
}

/**
 * Get cached live game status
 */
export function getCachedLiveGameStatus(): any | null {
	return cache.get('live-games-status');
}
