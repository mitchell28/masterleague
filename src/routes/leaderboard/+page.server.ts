import { error } from '@sveltejs/kit';
import { getLeagueTable } from '$lib/server/football/predictions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'You must be logged in to view the leaderboard');
	}

	try {
		const leaderboard = await getLeagueTable();
		return { leaderboard };
	} catch (err) {
		console.error('Error loading leaderboard data:', err);
		throw error(500, { message: 'Failed to load leaderboard data' });
	}
};
