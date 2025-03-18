import { error } from '@sveltejs/kit';
import { getLeagueTable, checkAndUpdateRecentFixtures } from '$lib/server/football/predictions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'You must be logged in to view the leaderboard');
	}

	try {
		// Check for fixtures that need updates - leaderboard is where users
		// will look for updated standings after matches complete
		// Force the update on leaderboard views to ensure latest scores
		checkAndUpdateRecentFixtures(true)
			.then((result) => {
				if (result.potentiallyMissed > 0) {
					console.log(
						`Leaderboard: Found ${result.potentiallyMissed} fixtures that might have been missed, updating their scores and points.`
					);
				}
				if (result.updated > 0) {
					console.log(
						`Leaderboard: Updated ${result.updated} fixtures, including ${result.live} live ones and ${result.recentlyCompleted} recently completed.`
					);
				}
			})
			.catch((err) => {
				console.error('Error updating fixture statuses:', err);
			});

		const leaderboard = await getLeagueTable();

		return {
			leaderboard
		};
	} catch (err) {
		console.error('Error loading leaderboard data:', err);
		throw error(500, { message: 'Failed to load leaderboard data' });
	}
};
