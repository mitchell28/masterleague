import { json } from '@sveltejs/kit';
import { initializeTeams } from '$lib/server/football/teams';

export async function GET() {
	try {
		await initializeTeams();
		return json({ success: true, message: 'Database initialized with Premier League teams' });
	} catch (error) {
		console.error('Failed to initialize database:', error);
		return json({ success: false, message: 'Failed to initialize database' }, { status: 500 });
	}
}
