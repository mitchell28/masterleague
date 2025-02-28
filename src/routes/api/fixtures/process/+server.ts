import { json } from '@sveltejs/kit';
import { processFixtureResults } from '$lib/server/football/predictions';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request }: RequestEvent) {
	try {
		const data = await request.json();

		// Validate the request
		if (!data.fixtureId) {
			return json({ success: false, message: 'Fixture ID is required' }, { status: 400 });
		}

		// Process the fixture results
		await processFixtureResults(data.fixtureId);

		return json({ success: true, message: 'Fixture results processed successfully' });
	} catch (error) {
		console.error('Failed to process fixture results:', error);
		return json({ success: false, message: 'Failed to process fixture results' }, { status: 500 });
	}
}
