import { checkAndUpdateRecentFixtures } from '../data/predictions/fixtureUpdateService.js';
import { cache, CacheKeys, CacheHelpers } from '../../cache/simple-cache.js';
import type { PredictionUpdateResult } from './prediction-processor.js';

/**
 * Simplified predictions processing with minimal caching
 * Removed complex CloudFlare KV and external API complexity
 */

/**
 * Simple function to update predictions with basic caching
 */
export async function updatePredictionsRealtime(): Promise<PredictionUpdateResult> {
	try {
		// Check if we updated recently (within 5 minutes)
		if (CacheHelpers.cronRanRecently('predictions-realtime', 5)) {
			console.log('⏭️ Predictions realtime update skipped - ran recently');
			return {
				success: true,
				predictionsProcessed: 0,
				fixturesProcessed: 0,
				pointsAwarded: 0,
				usersAffected: 0,
				leaderboardsUpdated: [],
				executionTime: 0,
				message: 'Skipped - ran recently'
			};
		}

		console.log('🔄 Running realtime predictions update...');
		const startTime = Date.now();

		// Simple fixture update check
		const updateResult = await checkAndUpdateRecentFixtures(true);

		// Mark as completed
		CacheHelpers.markCronCompleted('predictions-realtime');

		const executionTime = Date.now() - startTime;

		return {
			success: true,
			predictionsProcessed: updateResult.updated || 0,
			fixturesProcessed: updateResult.live + updateResult.recentlyCompleted || 0,
			pointsAwarded: 0, // Will be calculated during leaderboard update
			usersAffected: 0, // Will be calculated during leaderboard update
			leaderboardsUpdated: [],
			executionTime,
			message: `Updated ${updateResult.updated || 0} fixtures in ${executionTime}ms`
		};
	} catch (error) {
		console.error('❌ Realtime predictions update error:', error);
		return {
			success: false,
			predictionsProcessed: 0,
			fixturesProcessed: 0,
			pointsAwarded: 0,
			usersAffected: 0,
			leaderboardsUpdated: [],
			executionTime: 0,
			message: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Simple live fixture checking (every 2 minutes for live games)
 */
export async function checkLiveFixtures(): Promise<PredictionUpdateResult> {
	try {
		// Check if we checked live fixtures recently (within 2 minutes)
		if (CacheHelpers.cronRanRecently('live-fixtures', 2)) {
			console.log('⏭️ Live fixtures check skipped - checked recently');
			return {
				success: true,
				predictionsProcessed: 0,
				fixturesProcessed: 0,
				pointsAwarded: 0,
				usersAffected: 0,
				leaderboardsUpdated: [],
				executionTime: 0,
				message: 'Skipped - checked recently'
			};
		}

		console.log('⚽ Checking live fixtures...');
		const startTime = Date.now();

		// Check for live/recent fixtures that need updating
		const updateResult = await checkAndUpdateRecentFixtures(false); // Don't force, just check live

		// Mark as completed
		CacheHelpers.markCronCompleted('live-fixtures');

		const executionTime = Date.now() - startTime;

		return {
			success: true,
			predictionsProcessed: updateResult.updated || 0,
			fixturesProcessed: updateResult.live + updateResult.recentlyCompleted || 0,
			pointsAwarded: 0,
			usersAffected: 0,
			leaderboardsUpdated: [],
			executionTime,
			message: `Checked ${updateResult.live + updateResult.recentlyCompleted || 0} fixtures, updated ${updateResult.updated || 0} in ${executionTime}ms`
		};
	} catch (error) {
		console.error('❌ Live fixtures check error:', error);
		return {
			success: false,
			predictionsProcessed: 0,
			fixturesProcessed: 0,
			pointsAwarded: 0,
			usersAffected: 0,
			leaderboardsUpdated: [],
			executionTime: 0,
			message: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Cache live fixture data with simple TTL
 */
export function cacheLiveFixtureData(fixtureId: string, data: any): void {
	cache.set(CacheKeys.liveGame(fixtureId), data, 2); // 2 minutes TTL for live data
}

/**
 * Get cached live fixture data
 */
export function getCachedLiveFixtureData(fixtureId: string): any | null {
	return cache.get(`live_fixture:${fixtureId}`);
}

/**
 * Simplified function to get live predictions data
 */
export async function getLivePredictionsData(
	organizationId?: string,
	forceUpdate?: boolean
): Promise<any> {
	try {
		// For simplified version, just return cached live fixture data
		const cacheKey = organizationId ? `live_predictions:${organizationId}` : 'live_predictions:all';

		// If force update, clear cache first
		if (forceUpdate) {
			cache.delete(cacheKey);
		}

		const cached = cache.get(cacheKey);
		if (cached && !forceUpdate) {
			return cached;
		}

		// If no cache, return minimal response
		return {
			success: true,
			data: [],
			lastUpdate: new Date().toISOString(),
			message: 'No live predictions data available'
		};
	} catch (error) {
		console.error('Error getting live predictions data:', error);
		return {
			success: false,
			data: [],
			lastUpdate: new Date().toISOString(),
			message: 'Error fetching live predictions'
		};
	}
}

/**
 * Simplified predictions metadata function
 */
export async function getPredictionsMetadata(): Promise<any> {
	try {
		return {
			success: true,
			lastUpdate: new Date().toISOString(),
			liveFixtures: 0,
			processingStatus: 'simplified',
			message: 'Simplified predictions metadata'
		};
	} catch (error) {
		console.error('Error getting predictions metadata:', error);
		return {
			success: false,
			message: 'Error fetching predictions metadata'
		};
	}
}

/**
 * Simplified force refresh function
 */
export async function forceRefreshPredictions(organizationId?: string): Promise<any> {
	try {
		console.log('🔄 Force refreshing predictions...');

		// Clear related caches
		if (organizationId) {
			cache.delete(`live_predictions:${organizationId}`);
		} else {
			cache.delete('live_predictions:all');
		}

		// Run the realtime update
		const result = await updatePredictionsRealtime();

		return {
			success: true,
			result,
			message: 'Predictions force refreshed'
		};
	} catch (error) {
		console.error('Error force refreshing predictions:', error);
		return {
			success: false,
			message: 'Error force refreshing predictions'
		};
	}
}
