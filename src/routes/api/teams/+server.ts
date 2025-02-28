import { json } from '@sveltejs/kit';
import { getAllTeams } from '$lib/server/football/teams';

export async function GET() {
	try {
		const teams = await getAllTeams();
		return json({ success: true, teams });
	} catch (error) {
		console.error('Failed to get teams:', error);
		return json({ success: false, message: 'Failed to get teams' }, { status: 500 });
	}
}
