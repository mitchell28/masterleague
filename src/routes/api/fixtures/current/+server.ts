import { json } from '@sveltejs/kit';
import { getFixturesByWeek, getCurrentWeek } from '$lib/server/football/fixtures';

export async function GET() {
	try {
		const currentWeek = getCurrentWeek();
		const fixtures = await getFixturesByWeek(currentWeek);
		return json({ success: true, fixtures, week: currentWeek });
	} catch (error) {
		console.error('Failed to get current fixtures:', error);
		return json({ success: false, message: 'Failed to get current fixtures' }, { status: 500 });
	}
}
