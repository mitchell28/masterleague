import { getUpcomingFixturesForTeam } from '$lib/server/football/fixtures/fixtureRepository';
import { initializeTeams } from '$lib/server/football/teams';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const upcomingFixtures = await getUpcomingFixturesForTeam('ars', 5);

		return {
			upcomingFixtures
		};
	} catch (err) {
		console.error('Error initializing database:', err);

		return {
			initialized: {
				success: false,
				message: err instanceof Error ? err.message : 'Failed to initialize the database'
			}
		};
	}
};
