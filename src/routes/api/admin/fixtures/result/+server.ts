import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { updateFixtureResults } from '$lib/server/football/fixtures';
import { processFixtureResults } from '$lib/server/football/predictions';
import { requireAdmin } from '$lib/server/api-utils';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	// Check if user is authenticated and is an admin
	const authCheck = requireAdmin(event);
	if (!authCheck.success) {
		return authCheck.response;
	}

	try {
		const data = await event.request.json();

		// Validate the request
		if (
			!data.fixtureId ||
			typeof data.homeScore !== 'number' ||
			typeof data.awayScore !== 'number'
		) {
			return json(
				{
					success: false,
					message: 'Invalid request. fixtureId, homeScore, and awayScore are required.'
				},
				{ status: 400 }
			);
		}

		// Update fixture results
		const updatedFixture = await updateFixtureResults(
			data.fixtureId,
			data.homeScore,
			data.awayScore
		);

		if (!updatedFixture) {
			return json({ success: false, message: 'Fixture not found' }, { status: 404 });
		}

		// Process the fixture results (calculate points)
		await processFixtureResults(data.fixtureId);

		return json({
			success: true,
			message: 'Fixture results updated and processed successfully',
			fixture: updatedFixture
		});
	} catch (error) {
		console.error('Failed to update fixture results:', error);
		return json(
			{
				success: false,
				message: 'Failed to update fixture results'
			},
			{ status: 500 }
		);
	}
}
