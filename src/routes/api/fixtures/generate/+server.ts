import { json } from '@sveltejs/kit';
import { generateFixturesForCurrentWeek } from '$lib/server/football/fixtures';
import { initializeTeams } from '$lib/server/football/teams';

export async function POST() {
	try {
		// Make sure teams are initialized first
		await initializeTeams();

		// Force regeneration of fixtures for the current week
		const fixtures = await generateFixturesForCurrentWeek(true);
		return json({ success: true, fixtures });
	} catch (error) {
		console.error('Failed to generate fixtures:', error);
		// Return more specific error message for debugging
		return json(
			{
				success: false,
				message: 'Failed to generate fixtures',
				error: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
}
