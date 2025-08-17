import { json } from '@sveltejs/kit';
import { CronCoordinator } from '$lib/server/cache/cron-coordinator.js';
import type { RequestHandler } from './$types.js';

/**
 * GET /api/cron/health
 * Get health status of cron jobs
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const jobType = url.searchParams.get('jobType');

		const healthStatus = await CronCoordinator.getHealthStatus(jobType || undefined);

		// Calculate overall system health
		const allJobs = Object.values(healthStatus);
		const healthyJobs = allJobs.filter((job) => job.isHealthy).length;
		const totalJobs = allJobs.length;

		const overallHealth =
			healthyJobs === totalJobs
				? 'healthy'
				: healthyJobs > totalJobs * 0.7
					? 'warning'
					: 'critical';

		return json({
			success: true,
			overallHealth,
			healthyJobs,
			totalJobs,
			healthPercentage: Math.round((healthyJobs / totalJobs) * 100),
			jobs: healthStatus,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Cron health check error:', error);
		return json(
			{
				success: false,
				error: 'Failed to get cron health status',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/cron/health
 * Update health status for a specific job (called by cron scripts)
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { jobType, success, duration, itemsProcessed, errors } = await request.json();

		if (!jobType || success === undefined) {
			return json(
				{
					success: false,
					error: 'jobType and success fields are required'
				},
				{ status: 400 }
			);
		}

		await CronCoordinator.trackExecution(jobType, success, {
			duration,
			itemsProcessed,
			errors
		});

		return json({
			success: true,
			message: `Health status updated for ${jobType}`,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Cron health update error:', error);
		return json(
			{
				success: false,
				error: 'Failed to update cron health status',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
