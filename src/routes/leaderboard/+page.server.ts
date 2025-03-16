import { error } from '@sveltejs/kit';
import { getLeagueTable } from '$lib/server/football/predictions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'You must be logged in to view the leaderboard');
	}

	try {
		// Get the leaderboard data - the function now includes all required fields
		const leaderboard = await getLeagueTable();

		// Calculate some stats for display
		const scoringRules = {
			correctScoreline: 3,
			correctOutcome: 1
		};

		// Log the data for debugging
		console.log('Server returning leaderboard data:', leaderboard);

		// Return data to page
		return {
			leaderboard,
			scoringRules
		};
	} catch (err) {
		console.error('Error loading leaderboard data:', err);
		throw error(500, { message: 'Failed to load leaderboard data' });
	}
};
