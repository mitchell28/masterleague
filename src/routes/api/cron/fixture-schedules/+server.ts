import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

/**
 * GET /api/cron/fixture-schedules
 * Daily cron job to check for fixture schedule changes
 *
 * Usage: Call this endpoint daily via cron job or scheduler
 * Example: curl -X GET https://yoursite.com/api/cron/fixture-schedules
 */
export const GET: RequestHandler = async ({ fetch }) => {
	try {
		console.log('🕐 Daily fixture schedule check started');

		// Trigger the background processing
		const response = await fetch('/api/background', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				// Add a special header to identify this as a cron request
				'X-Cron-Job': 'fixture-schedules'
			},
			body: JSON.stringify({
				action: 'check-fixture-schedules'
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(`Background API failed: ${response.status} ${errorData.error || ''}`);
		}

		const data = await response.json();

		console.log('✅ Daily fixture schedule check completed');
		console.log(
			`📊 Results: ${data.result?.checked || 0} checked, ${data.result?.updated || 0} updated`
		);

		return json({
			success: true,
			message: 'Fixture schedule check completed',
			data: {
				checked: data.result?.checked || 0,
				updated: data.result?.updated || 0,
				changes: data.result?.changes?.length || 0,
				timestamp: new Date().toISOString()
			}
		});
	} catch (error) {
		console.error('❌ Daily fixture schedule check failed:', error);

		return json(
			{
				success: false,
				error: 'Failed to run fixture schedule check',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};
