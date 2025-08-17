import { getUpcomingFixturesForTeam } from '$lib/server/engine/data/fixtures/fixtureRepository';
import { initializeTeams } from '$lib/server/engine/data/teams';
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
