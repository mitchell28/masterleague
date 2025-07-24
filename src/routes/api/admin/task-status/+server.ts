import { json, error } from '@sveltejs/kit';
import { runs } from '@trigger.dev/sdk/v3';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Verify user is admin
	if (locals.user?.role !== 'admin') {
		throw error(403, 'Not authorized');
	}

	const runId = url.searchParams.get('runId');

	if (!runId) {
		throw error(400, 'runId parameter is required');
	}

	try {
		// Get the run details
		const run = await runs.retrieve(runId);

		return json({
			success: true,
			run: {
				id: run.id,
				status: run.status,
				taskIdentifier: run.taskIdentifier,
				createdAt: run.createdAt,
				startedAt: run.startedAt,
				completedAt: run.completedAt,
				output: run.output,
				error: run.error,
				metadata: run.metadata
			}
		});
	} catch (err) {
		console.error('Error retrieving run status:', err);

		return json(
			{
				success: false,
				message: err instanceof Error ? err.message : 'Failed to retrieve run status'
			},
			{ status: 500 }
		);
	}
};
