import { json } from '@sveltejs/kit';
import { CronCoordinator } from '$lib/server/cache/cron-coordinator.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/cron/coordinate
 * Coordinate cron job execution to prevent conflicts
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action, lockType, identifier, jobType, intervalMinutes } = await request.json();

		switch (action) {
			case 'acquire_lock': {
				if (!lockType) {
					return json({ success: false, error: 'lockType is required' }, { status: 400 });
				}

				const result = await CronCoordinator.acquireLock(lockType, identifier);

				return json({
					success: result.acquired,
					acquired: result.acquired,
					heldBy: result.heldBy,
					ttl: result.ttl,
					message: result.acquired
						? `Lock acquired for ${lockType}`
						: `Lock already held by ${result.heldBy} (TTL: ${result.ttl}s)`
				});
			}

			case 'release_lock': {
				if (!lockType) {
					return json({ success: false, error: 'lockType is required' }, { status: 400 });
				}

				const released = await CronCoordinator.releaseLock(lockType, identifier);

				return json({
					success: released,
					message: released
						? `Lock released for ${lockType}`
						: `Failed to release lock for ${lockType}`
				});
			}

			case 'should_run': {
				if (!jobType || !intervalMinutes) {
					return json(
						{
							success: false,
							error: 'jobType and intervalMinutes are required'
						},
						{ status: 400 }
					);
				}

				const shouldRun = await CronCoordinator.shouldJobRun(jobType, intervalMinutes, {
					skipIfRecentlyFailed: true,
					maxConsecutiveFailures: 5
				});

				return json({
					success: true,
					shouldRun: shouldRun.shouldRun,
					reason: shouldRun.reason,
					message: shouldRun.shouldRun
						? `Job ${jobType} should run: ${shouldRun.reason}`
						: `Job ${jobType} should skip: ${shouldRun.reason}`
				});
			}

			default:
				return json(
					{
						success: false,
						error: `Unknown action: ${action}`
					},
					{ status: 400 }
				);
		}
	} catch (error) {
		console.error('Cron coordination error:', error);
		return json(
			{
				success: false,
				error: 'Failed to coordinate cron job',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * GET /api/cron/coordinate
 * Get current lock status and coordination info
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const lockType = url.searchParams.get('lockType') as 'leaderboard' | 'fixtures' | 'maintenance';
		const identifier = url.searchParams.get('identifier');

		if (!lockType) {
			return json(
				{
					success: false,
					error: 'lockType parameter is required'
				},
				{ status: 400 }
			);
		}

		// Check lock status without acquiring
		const result = await CronCoordinator.acquireLock(lockType, identifier);

		// If we acquired it, release immediately (this was just a check)
		if (result.acquired) {
			await CronCoordinator.releaseLock(lockType, identifier);
		}

		return json({
			success: true,
			lockType,
			identifier,
			isLocked: !result.acquired,
			heldBy: result.heldBy,
			ttl: result.ttl,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Cron coordination status error:', error);
		return json(
			{
				success: false,
				error: 'Failed to get coordination status',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
