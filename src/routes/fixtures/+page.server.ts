import { error } from '@sveltejs/kit';
import type { Fixture, Team } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }: { fetch: any }) => {
	try {
		// Fetch current fixtures
		const fixturesResponse = await fetch('/api/fixtures/current');
		const fixturesData = await fixturesResponse.json();

		if (!fixturesData.success) {
			throw new Error(fixturesData.message || 'Failed to load fixtures');
		}

		const fixtures: Fixture[] = fixturesData.fixtures;
		const week: number = fixturesData.week;

		// If we have fixtures, also fetch team data
		let teams: Record<string, Team> = {};
		if (fixtures.length > 0) {
			const teamsResponse = await fetch('/api/teams');
			const teamsData = await teamsResponse.json();

			if (teamsData.success) {
				// Convert array to record for easy lookup
				teams = teamsData.teams.reduce((acc: Record<string, Team>, team: Team) => {
					acc[team.id] = team;
					return acc;
				}, {});
			}
		}

		return {
			fixtures,
			teams,
			week
		};
	} catch (err) {
		console.error('Error loading fixtures data:', err);
		throw error(500, { message: 'Failed to load fixtures data' });
	}
};
export const actions = {
	generateFixtures: async ({ fetch }: { fetch: any }) => {
		try {
			const response = await fetch('/api/fixtures/generate', {
				method: 'POST'
			});
			const data = await response.json();

			if (!data.success) {
				throw new Error(data.message || 'Failed to generate fixtures');
			}

			return {
				success: true,
				fixtures: data.fixtures
			};
		} catch (err) {
			console.error('Error generating fixtures:', err);
			return {
				success: false,
				message: 'An error occurred while generating fixtures'
			};
		}
	}
};
