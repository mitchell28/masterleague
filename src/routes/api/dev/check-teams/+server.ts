import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		console.log('🔍 Checking teams in database...');

		// Import database functions
		const { db } = await import('$lib/server/db');
		const { teams } = await import('$lib/server/db/schema');

		// Get all teams
		const allTeams = await db.select().from(teams);
		console.log(`📊 Total teams: ${allTeams.length}`);

		// Map team IDs to names for debugging
		const teamMap = allTeams.reduce(
			(acc, team) => {
				acc[team.id] = team.name;
				return acc;
			},
			{} as Record<string, string>
		);

		return json({
			success: true,
			totalTeams: allTeams.length,
			teams: allTeams.map((t) => ({
				id: t.id,
				name: t.name,
				shortName: t.shortName,
				logo: t.logo
			})),
			teamMap
		});
	} catch (err) {
		console.error('❌ Error checking teams:', err);

		return json(
			{
				success: false,
				message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};
