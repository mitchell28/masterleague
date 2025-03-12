import { initializeTeams } from '$lib/server/football/teams';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		// Initialize the database with Premier League teams
		await initializeTeams();

		return {
			initialized: {
				success: true,
				message: 'Database initialized successfully'
			}
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
