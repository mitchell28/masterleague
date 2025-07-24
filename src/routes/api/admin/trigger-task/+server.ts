import { json, error } from '@sveltejs/kit';
import { tasks } from '@trigger.dev/sdk/v3';
import type { RequestHandler } from './$types';

// Import the task types for type safety
import type {
	updateFixtureCountsTask,
	updateCurrentWeekMultipliersTask,
	updateAllMultipliersTask,
	recoverFixturesTask,
	recalculateAllPointsTask
} from '$lib/trigger/adminTasks';

/**
 * Mapping of action names to task IDs for triggering
 */
const TASK_MAPPING = {
	updateFixtureCounts: 'update-fixture-counts',
	updateMultipliers: 'update-current-week-multipliers',
	updateAllMultipliers: 'update-all-multipliers',
	recoverFixtures: 'recover-fixtures',
	recalculateAllPoints: 'recalculate-all-points'
} as const;

type ActionType = keyof typeof TASK_MAPPING;

export const POST: RequestHandler = async ({ request, locals }) => {
	// Verify user is admin
	if (locals.user?.role !== 'admin') {
		throw error(403, 'Not authorized');
	}

	try {
		const body = await request.json();
		const { action } = body;

		if (!action || !(action in TASK_MAPPING)) {
			throw error(400, 'Invalid action specified');
		}

		const taskId = TASK_MAPPING[action as ActionType];

		console.log(`Admin ${locals.user.email} triggering task: ${taskId}`);

		// Trigger the task using the tasks API
		const handle = await tasks.trigger(taskId, undefined, {
			// Add some metadata to track who triggered the task
			metadata: {
				triggeredBy: locals.user.id,
				triggeredByEmail: locals.user.email,
				triggeredAt: new Date().toISOString(),
				source: 'admin-panel'
			}
		});

		console.log(`Task ${taskId} triggered successfully with run ID: ${handle.id}`);

		return json({
			success: true,
			message: `Task started successfully. Run ID: ${handle.id}`,
			runId: handle.id,
			taskId: taskId
		});
	} catch (err) {
		console.error('Error triggering admin task:', err);

		if (err instanceof Error) {
			return json(
				{
					success: false,
					message: err.message
				},
				{ status: 500 }
			);
		}

		return json(
			{
				success: false,
				message: 'An unexpected error occurred'
			},
			{ status: 500 }
		);
	}
};
