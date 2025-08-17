import { checkAndUpdateRecentFixtures } from '../data/predictions/fixtureUpdateService.js';
import { getLeaderboard } from './leaderboard.js';
import { CronCoordinator } from '../../cache/cron-coordinator.js';
import { kv } from '../../cache/cloudflare-kv.js';
import type { PredictionUpdateResult } from './prediction-processor.js';

/**
 * Enhanced predictions processing with real-time capabilities
 * Handles live fixture updates with CloudflareKV caching and external API rate limiting
 */

// Cache keys for predictions real-time data
const CACHE_KEYS = {
	LIVE_FIXTURES: 'predictions:live_fixtures',
	RECENT_UPDATES: 'predictions:recent_updates',
	API_CALL_COUNT: 'predictions:api_calls',
	LAST_EXTERNAL_API_CALL: 'predictions:last_external_call',
	FIXTURE_UPDATE_STATUS: 'predictions:fixture_status',
	PREDICTIONS_METADATA: 'predictions:metadata'
} as const;

// Configuration constants
const EXTERNAL_API_RATE_LIMIT = 10; // Football Data API: 10 calls per minute
const API_CALL_WINDOW = 60 * 1000; // 1 minute window
const LIVE_UPDATE_INTERVAL = 15 * 1000; // 15 seconds for live fixtures
const CACHE_TTL = {
	LIVE_DATA: 30, // 30 seconds for live match data
	FIXTURE_STATUS: 120, // 2 minutes for fixture status
	API_RATE_LIMIT: 60, // 1 minute for API call tracking
	PREDICTIONS_META: 300 // 5 minutes for predictions metadata
};

interface LivePredictionsData {
	liveFixtures: any[];
	recentUpdates: PredictionUpdateResult[];
	lastUpdated: number;
	hasLiveMatches: boolean;
	nextUpdateIn: number;
	apiCallsRemaining: number;
	cacheStatus: 'fresh' | 'stale' | 'expired';
}

interface PredictionsCacheMetadata {
	lastFullUpdate: number;
	lastLiveUpdate: number;
	externalApiCalls: number;
	lastExternalApiCall: number;
	pendingUpdates: number;
	cronHealth: 'healthy' | 'degraded' | 'failed';
}

/**
 * Get current predictions data with real-time awareness
 * Prioritizes cached data and manages external API calls efficiently
 */
export async function getLivePredictionsData(
	organizationId?: string,
	forceRefresh = false
): Promise<LivePredictionsData> {
	const startTime = Date.now();
	const cronCoordinator = new CronCoordinator();

	try {
		// Check if we can use cached data
		if (!forceRefresh) {
			const cachedData = await getCachedPredictionsData();
			if (cachedData && shouldUseCachedData(cachedData)) {
				return cachedData;
			}
		}

		// Check external API rate limiting
		const canCallExternalAPI = await checkExternalAPIRateLimit();

		// Acquire lock for predictions processing
		const lockAcquired = await cronCoordinator.acquireLock('predictions-realtime', 30);
		if (!lockAcquired) {
			// Return cached data if we can't get lock
			const fallbackData = await getCachedPredictionsData();
			return fallbackData || getDefaultPredictionsData();
		}

		try {
			// Process fixture updates with rate limiting awareness
			const updateResult = await checkAndUpdateRecentFixtures(!canCallExternalAPI);

			// Get live fixtures status
			const liveFixtures = await getLiveFixturesFromCache();

			// Update API call tracking if we made external calls
			if (canCallExternalAPI && updateResult.updated > 0) {
				await trackExternalAPICall();
			}

			// Prepare response data
			const responseData: LivePredictionsData = {
				liveFixtures,
				recentUpdates: [updateResult],
				lastUpdated: startTime,
				hasLiveMatches: liveFixtures.length > 0,
				nextUpdateIn: calculateNextUpdateInterval(liveFixtures.length > 0),
				apiCallsRemaining: await getRemainingAPICalls(),
				cacheStatus: 'fresh'
			};

			// Cache the results
			await cachePredictionsData(responseData);
			await updatePredictionsMetadata(updateResult, canCallExternalAPI);

			// If live matches are active, trigger leaderboard cache warming in background
			if (liveFixtures.length > 0) {
				// Don't await - let it run in background
				warmLeaderboardCache(organizationId).catch(console.error);
			}

			return responseData;
		} finally {
			await cronCoordinator.releaseLock('predictions-realtime');
		}
	} catch (error) {
		console.error('Live predictions data fetch failed:', error);

		// Return cached data as fallback
		const fallbackData = await getCachedPredictionsData();
		return fallbackData || getDefaultPredictionsData();
	}
}

/**
 * Check if external API calls are within rate limit
 */
async function checkExternalAPIRateLimit(): Promise<boolean> {
	try {
		const now = Date.now();
		const callCountData = await kv.get(CACHE_KEYS.API_CALL_COUNT);

		if (!callCountData) {
			return true; // No previous calls recorded
		}

		const { count, windowStart } = callCountData;
		const windowAge = now - windowStart;

		// Reset counter if window has expired
		if (windowAge >= API_CALL_WINDOW) {
			await kv.set(
				CACHE_KEYS.API_CALL_COUNT,
				{ count: 0, windowStart: now },
				{ ttl: CACHE_TTL.API_RATE_LIMIT }
			);
			return true;
		}

		// Check if we're under the rate limit
		return count < EXTERNAL_API_RATE_LIMIT;
	} catch (error) {
		console.error('Rate limit check failed:', error);
		return false; // Conservative approach - don't make external calls if check fails
	}
}

/**
 * Track an external API call for rate limiting
 */
async function trackExternalAPICall(): Promise<void> {
	try {
		const now = Date.now();
		const callCountData = (await kv.get(CACHE_KEYS.API_CALL_COUNT)) || {
			count: 0,
			windowStart: now
		};

		// Increment call count
		await kv.set(
			CACHE_KEYS.API_CALL_COUNT,
			{
				count: callCountData.count + 1,
				windowStart: callCountData.windowStart
			},
			{ ttl: CACHE_TTL.API_RATE_LIMIT }
		);

		// Track last external API call timestamp
		await kv.set(CACHE_KEYS.LAST_EXTERNAL_API_CALL, now, { ttl: CACHE_TTL.API_RATE_LIMIT });
	} catch (error) {
		console.error('Failed to track external API call:', error);
	}
}

/**
 * Get remaining API calls in current window
 */
async function getRemainingAPICalls(): Promise<number> {
	try {
		const callCountData = await kv.get(CACHE_KEYS.API_CALL_COUNT);
		if (!callCountData) return EXTERNAL_API_RATE_LIMIT;

		const { count, windowStart } = callCountData;
		const windowAge = Date.now() - windowStart;

		// Reset if window expired
		if (windowAge >= API_CALL_WINDOW) {
			return EXTERNAL_API_RATE_LIMIT;
		}

		return Math.max(0, EXTERNAL_API_RATE_LIMIT - count);
	} catch (error) {
		console.error('Failed to get remaining API calls:', error);
		return 0; // Conservative approach
	}
}

/**
 * Get cached predictions data
 */
async function getCachedPredictionsData(): Promise<LivePredictionsData | null> {
	try {
		return await kv.get(CACHE_KEYS.LIVE_FIXTURES);
	} catch (error) {
		console.error('Failed to get cached predictions data:', error);
		return null;
	}
}

/**
 * Check if cached data is still valid
 */
function shouldUseCachedData(cachedData: LivePredictionsData): boolean {
	const age = Date.now() - cachedData.lastUpdated;
	const maxAge = cachedData.hasLiveMatches ? LIVE_UPDATE_INTERVAL : CACHE_TTL.FIXTURE_STATUS * 1000;

	return age < maxAge;
}

/**
 * Cache predictions data
 */
async function cachePredictionsData(data: LivePredictionsData): Promise<void> {
	try {
		const ttl = data.hasLiveMatches ? CACHE_TTL.LIVE_DATA : CACHE_TTL.FIXTURE_STATUS;
		await kv.set(CACHE_KEYS.LIVE_FIXTURES, data, { ttl });
	} catch (error) {
		console.error('Failed to cache predictions data:', error);
	}
}

/**
 * Get live fixtures from cache or default
 */
async function getLiveFixturesFromCache(): Promise<any[]> {
	try {
		const cached = await kv.get(CACHE_KEYS.LIVE_FIXTURES);
		return cached?.liveFixtures || [];
	} catch (error) {
		console.error('Failed to get live fixtures from cache:', error);
		return [];
	}
}

/**
 * Calculate next update interval based on context
 */
function calculateNextUpdateInterval(hasLiveMatches: boolean): number {
	if (hasLiveMatches) {
		return LIVE_UPDATE_INTERVAL;
	}
	return CACHE_TTL.FIXTURE_STATUS * 1000;
}

/**
 * Update predictions metadata for monitoring
 */
async function updatePredictionsMetadata(
	updateResult: any,
	usedExternalAPI: boolean
): Promise<void> {
	try {
		const now = Date.now();
		const existing = (await kv.get(CACHE_KEYS.PREDICTIONS_METADATA)) || {};

		const metadata: PredictionsCacheMetadata = {
			lastFullUpdate: existing.lastFullUpdate || now,
			lastLiveUpdate: now,
			externalApiCalls: existing.externalApiCalls + (usedExternalAPI ? 1 : 0),
			lastExternalApiCall: usedExternalAPI ? now : existing.lastExternalApiCall,
			pendingUpdates: updateResult.updated || 0,
			cronHealth: 'healthy' // Will be updated by cron coordinator
		};

		await kv.set(CACHE_KEYS.PREDICTIONS_METADATA, metadata, { ttl: CACHE_TTL.PREDICTIONS_META });
	} catch (error) {
		console.error('Failed to update predictions metadata:', error);
	}
}

/**
 * Warm leaderboard cache in background when live matches are active
 * This ensures leaderboard updates quickly when predictions change
 */
async function warmLeaderboardCache(organizationId?: string): Promise<void> {
	try {
		// Call leaderboard function with background flag
		await getLeaderboard(organizationId, undefined, true);
	} catch (error) {
		console.error('Background leaderboard cache warming failed:', error);
	}
}

/**
 * Get default predictions data when all else fails
 */
function getDefaultPredictionsData(): LivePredictionsData {
	return {
		liveFixtures: [],
		recentUpdates: [],
		lastUpdated: Date.now(),
		hasLiveMatches: false,
		nextUpdateIn: CACHE_TTL.FIXTURE_STATUS * 1000,
		apiCallsRemaining: EXTERNAL_API_RATE_LIMIT,
		cacheStatus: 'expired'
	};
}

/**
 * Force refresh predictions data - bypasses all caching
 * Use sparingly as this will make external API calls
 */
export async function forceRefreshPredictions(
	organizationId?: string
): Promise<LivePredictionsData> {
	return getLivePredictionsData(organizationId, true);
}

/**
 * Get predictions metadata for monitoring and debugging
 */
export async function getPredictionsMetadata(): Promise<PredictionsCacheMetadata | null> {
	try {
		return await kv.get(CACHE_KEYS.PREDICTIONS_METADATA);
	} catch (error) {
		console.error('Failed to get predictions metadata:', error);
		return null;
	}
}
