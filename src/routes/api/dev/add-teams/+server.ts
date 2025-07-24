import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	try {
		console.log('🔄 Adding missing 2025-26 teams...');

		// Import database functions
		const { db } = await import('$lib/server/db');
		const { teams } = await import('$lib/server/db/schema');

		// Missing teams for 2025-26 season
		const missingTeams = [
			{
				id: 'sun',
				name: 'Sunderland',
				shortName: 'SUN',
				logo: 'https://logos.footapi.com/crest/sunderland.png' // Default logo
			},
			{
				id: 'bur',
				name: 'Burnley',
				shortName: 'BUR',
				logo: 'https://logos.footapi.com/crest/burnley.png' // Default logo
			}
		];

		// Check if teams already exist
		const existingTeams = await db.select().from(teams);
		const existingIds = existingTeams.map((t) => t.id);

		const teamsToAdd = missingTeams.filter((team) => !existingIds.includes(team.id));

		if (teamsToAdd.length === 0) {
			return json({
				success: true,
				message: 'All teams already exist',
				added: 0
			});
		}

		// Insert missing teams
		await db.insert(teams).values(teamsToAdd);

		console.log(`✅ Added ${teamsToAdd.length} missing teams`);

		return json({
			success: true,
			message: `Added ${teamsToAdd.length} missing teams: ${teamsToAdd.map((t) => t.name).join(', ')}`,
			added: teamsToAdd.length,
			teams: teamsToAdd
		});
	} catch (err) {
		console.error('❌ Error adding teams:', err);

		return json(
			{
				success: false,
				message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};
