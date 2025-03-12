import type { PageServerLoad, Actions } from './$types';
import type { Team } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { fixtures as fixturesSchema } from '$lib/server/db/schema';
import {
	getCurrentWeek,
	getFixturesByWeek,
	updateFixtureResults
} from '$lib/server/football/fixtures';
import { processFixtureResults } from '$lib/server/football/predictions';
import { getAllTeams } from '$lib/server/football/teams';

export const load = (async ({ locals, url }) => {
	// Check if user is authenticated and is an admin
	if (!locals.user?.id) {
		throw redirect(302, '/auth/login');
	}

	if (locals.user.role !== 'admin') {
		throw error(403, 'You do not have permission to access this page');
	}

	// Get selected week from URL or default to 0
	const weekParam = url.searchParams.get('week');
	let selectedWeek = weekParam ? parseInt(weekParam) : 0;

	// Get current week
	const currentWeek = getCurrentWeek();

	// Get all distinct week IDs
	const weeksResult = await db
		.select({ weekId: fixturesSchema.weekId })
		.from(fixturesSchema)
		.groupBy(fixturesSchema.weekId)
		.orderBy(fixturesSchema.weekId);

	const availableWeeks = weeksResult.map((row) => row.weekId);

	// If no week selected or invalid week, use current week
	if (!selectedWeek || !availableWeeks.includes(selectedWeek)) {
		selectedWeek = currentWeek;
	}

	// Get fixtures for selected week
	const fixtures = await getFixturesByWeek(selectedWeek);

	// Get teams data
	const teamsData = await getAllTeams();

	// Convert array to record for easy lookup
	const teams: Record<string, Team> = {};
	teamsData.forEach((team: Team) => {
		teams[team.id] = team;
	});

	return {
		fixtures,
		teams,
		availableWeeks,
		selectedWeek,
		currentWeek
	};
}) satisfies PageServerLoad;

export const actions = {
	saveResult: async ({ request, locals }) => {
		// Check if user is authenticated and is an admin
		if (!locals.user?.id) {
			throw error(401, 'You must be logged in to update results');
		}

		if (locals.user.role !== 'admin') {
			throw error(403, 'You do not have permission to update results');
		}

		const data = await request.formData();
		const fixtureId = data.get('fixtureId') as string;
		const homeScore = parseInt(data.get('homeScore') as string);
		const awayScore = parseInt(data.get('awayScore') as string);

		try {
			// Validate the request
			if (!fixtureId || isNaN(homeScore) || isNaN(awayScore)) {
				return {
					success: false,
					message: 'Invalid request. fixtureId, homeScore, and awayScore are required.'
				};
			}

			// Update fixture results
			const updatedFixture = await updateFixtureResults(fixtureId, homeScore, awayScore);

			if (!updatedFixture) {
				return { success: false, message: 'Fixture not found' };
			}

			// Process the fixture results (calculate points)
			await processFixtureResults(fixtureId);

			return {
				success: true,
				message: 'Fixture results updated and processed successfully',
				fixture: updatedFixture
			};
		} catch (error) {
			console.error('Failed to update fixture results:', error);
			return {
				success: false,
				message: 'Failed to update fixture results'
			};
		}
	}
} satisfies Actions;
