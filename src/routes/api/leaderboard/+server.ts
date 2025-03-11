import { json } from '@sveltejs/kit';
import { getLeagueTable } from '$lib/server/football/predictions';
import type { RequestEvent } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/api-utils';

export async function GET(event: RequestEvent) {
	// Check if user is authenticated
	const authResult = requireAuth(event);
	if (!authResult.success) {
		return authResult.response;
	}

	try {
		const leaderboard = await getLeagueTable();
		return json({ success: true, leaderboard });
	} catch (error) {
		console.error('Failed to get leaderboard:', error);
		return json(
			{
				success: false,
				message: 'Failed to get leaderboard',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
