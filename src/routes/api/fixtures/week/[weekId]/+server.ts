import { json } from '@sveltejs/kit';
import { getFixturesByWeek } from '$lib/server/football/fixtures';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ params }: RequestEvent) {
	try {
		if (!params.weekId) {
			return json({ success: false, message: 'Week ID is required' }, { status: 400 });
		}

		const weekId = parseInt(params.weekId);

		if (isNaN(weekId)) {
			return json({ success: false, message: 'Invalid week ID' }, { status: 400 });
		}

		const fixtures = await getFixturesByWeek(weekId);

		return json({
			success: true,
			fixtures,
			week: weekId
		});
	} catch (error) {
		console.error('Failed to get fixtures for week:', error);
		return json(
			{
				success: false,
				message: 'Failed to get fixtures for week'
			},
			{ status: 500 }
		);
	}
}
