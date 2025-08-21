import { json } from '@sveltejs/kit';
import {
	getLivePredictionsData,
	getPredictionsMetadata
} from '$lib/server/engine/analytics/predictions-realtime-simple.js';
import { CronCoordinator } from '$lib/server/cache/cron-coordinator.js';
import { updatePredictions } from '$lib/server/engine/analytics/prediction-processor.js';
import type { RequestHandler } from './$types';

/**
 * Predictions cron update endpoint
 * Coordinates with leaderboard crons to maintain data consistency
 */
export const POST: RequestHandler = async ({ url, request }) => {
	const startTime = Date.now();

	try {
		// Get optional parameters
		const organizationId = url.searchParams.get('organizationId');
		const forceUpdate = url.searchParams.get('force') === 'true';
		const priority = url.searchParams.get('priority') || 'normal';

		console.log(
			`Predictions cron started: org=${organizationId || 'all'}, force=${forceUpdate}, priority=${priority}`
		);

		// Check cron coordination locks using static methods
		const lockResult = await CronCoordinator.acquireLock('fixtures', 'predictions');

		if (!lockResult.acquired) {
			console.log('Predictions cron skipped - another instance running');
			return json({
				success: true,
				skipped: true,
				reason: 'Another predictions cron instance is running',
				heldBy: lockResult.heldBy,
				timestamp: Date.now()
			});
		}

		try {
			// Track cron execution start
			await CronCoordinator.trackExecution('predictions-update-start', true);

			// Phase 1: Update fixture data and process predictions
			console.log('Phase 1: Processing predictions updates...');
			const predictionUpdateResult = await updatePredictions(organizationId || undefined);

			// Phase 2: Get live predictions data to warm cache
			console.log('Phase 2: Warming predictions cache...');
			const liveData = await getLivePredictionsData(organizationId || undefined, forceUpdate);

			// Phase 3: Use enhanced coordination for leaderboard triggering
			let leaderboardTriggered = false;
			if (predictionUpdateResult.success) {
				console.log('Phase 3: Checking leaderboard coordination...');

				const coordination = await CronCoordinator.coordinatePredictionsLeaderboard(
					organizationId || 'default',
					liveData.hasLiveMatches,
					predictionUpdateResult
				);

				if (coordination.shouldTriggerLeaderboard) {
					console.log(
						`Triggering leaderboard: ${coordination.reason} (${coordination.coordination})`
					);
					await triggerLeaderboardCron(organizationId, priority);
					leaderboardTriggered = true;
				} else {
					console.log(`Skipping leaderboard: ${coordination.reason}`);
				}
			}

			// Phase 4: Update metadata and track completion
			const metadata = await getPredictionsMetadata();
			const executionTime = Date.now() - startTime;

			await CronCoordinator.trackExecution('predictions-update', true, {
				duration: executionTime,
				itemsProcessed: predictionUpdateResult?.fixturesProcessed || 0
			});

			console.log(
				`Predictions cron completed in ${executionTime}ms: ${predictionUpdateResult?.fixturesProcessed || 0} fixtures processed`
			);

			// Return comprehensive results
			return json({
				success: true,
				executionTime,
				predictionsUpdate: predictionUpdateResult || { fixturesProcessed: 0 },
				liveData: {
					hasLiveMatches: liveData?.hasLiveMatches || false,
					liveFixturesCount: liveData?.liveFixtures?.length || 0,
					cacheStatus: liveData?.cacheStatus || 'unknown',
					apiCallsRemaining: liveData?.apiCallsRemaining || 0
				},
				coordination: {
					leaderboardTriggered,
					lockAcquired: true,
					priority
				},
				metadata,
				timestamp: Date.now()
			});
		} finally {
			await CronCoordinator.releaseLock('fixtures', 'predictions');
		}
	} catch (error) {
		console.error('Predictions cron failed:', error);

		// Track failed execution
		await CronCoordinator.trackExecution('predictions-update', false, {
			duration: Date.now() - startTime,
			errors: [error instanceof Error ? error.message : 'Unknown error']
		}).catch(console.error);

		const executionTime = Date.now() - startTime;

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				executionTime,
				timestamp: Date.now()
			},
			{ status: 500 }
		);
	}
};

/**
 * GET handler for cron status and health monitoring
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		// Get current predictions metadata
		const metadata = await getPredictionsMetadata();

		// Get cron health status using static method
		const health = await CronCoordinator.getHealthStatus('predictions-update');

		// Check if live updates are needed
		const liveData = await getLivePredictionsData(undefined, false);

		return json({
			health,
			metadata,
			liveStatus: {
				hasLiveMatches: liveData.hasLiveMatches,
				cacheStatus: liveData.cacheStatus,
				nextUpdateIn: liveData.nextUpdateIn,
				apiCallsRemaining: liveData.apiCallsRemaining
			},
			timestamp: Date.now()
		});
	} catch (error) {
		console.error('Failed to get predictions cron status:', error);

		return json(
			{
				error: 'Failed to get cron status',
				timestamp: Date.now()
			},
			{ status: 500 }
		);
	}
};

/**
 * Trigger leaderboard cron with coordination
 */
async function triggerLeaderboardCron(
	organizationId: string | null,
	priority: string
): Promise<void> {
	try {
		// Use internal API call to trigger leaderboard update
		const leaderboardUrl = new URL('/api/cron/coordinate', 'http://localhost');
		if (organizationId) {
			leaderboardUrl.searchParams.set('organizationId', organizationId);
		}
		leaderboardUrl.searchParams.set('source', 'predictions-cron');
		leaderboardUrl.searchParams.set('priority', priority);

		// Make internal request to leaderboard cron coordinator
		const response = await fetch(leaderboardUrl.toString(), {
			method: 'POST',
			headers: {
				authorization: `Bearer ${process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				triggered_by: 'predictions-cron',
				reason: 'predictions_updated'
			})
		});

		if (!response.ok) {
			console.error(`Failed to trigger leaderboard cron: ${response.status}`);
		} else {
			console.log('Successfully triggered leaderboard cron coordination');
		}
	} catch (error) {
		console.error('Error triggering leaderboard cron:', error);
	}
}
