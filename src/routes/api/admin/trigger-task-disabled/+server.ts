import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	// Verify user is admin
	if (locals.user?.role !== 'admin') {
		throw error(403, 'Not authorized');
	}

	// Manual triggers have been disabled - all tasks now run automatically
	return json(
		{
			success: false,
			message:
				'Manual task triggers have been disabled. All maintenance tasks now run automatically on optimized schedules. Check the admin dashboard for task schedules and monitoring.'
		},
		{ status: 400 }
	);
};
