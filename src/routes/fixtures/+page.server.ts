import { error } from '@sveltejs/kit';
import type { Fixture, Team } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	try {
		// Get week from URL params
		const requestedWeek = url.searchParams.get('week');

		// Fetch available weeks and current week
		const weeksResponse = await fetch('/api/fixtures/weeks');
		const weeksData = await weeksResponse.json();

		if (!weeksData.success) {
			throw new Error(weeksData.message || 'Failed to load weeks data');
		}

		// Normalize weeks data
		const weeks = weeksData.weeks
			.map((w: string | number) => parseInt(String(w)))
			.sort((a: number, b: number) => a - b);
		const currentWeek = parseInt(String(weeksData.currentWeek));

		// Determine which week to load
		let weekToLoad = currentWeek;
		if (requestedWeek) {
			const parsedWeek = parseInt(requestedWeek);
			if (weeks.includes(parsedWeek)) {
				weekToLoad = parsedWeek;
			}
		}

		// Fetch fixtures for the selected week
		const fixturesResponse = await fetch(`/api/fixtures/week/${weekToLoad}`);
		const fixturesData = await fixturesResponse.json();

		if (!fixturesData.success) {
			throw new Error(fixturesData.message || 'Failed to load fixtures');
		}

		const fixtures: Fixture[] = fixturesData.fixtures;
		const week: number = fixturesData.week;

		// Fetch team data if we have fixtures
		let teams: Record<string, Team> = {};
		if (fixtures.length > 0) {
			const teamsResponse = await fetch('/api/teams');
			const teamsData = await teamsResponse.json();

			if (teamsData.success) {
				teams = teamsData.teams.reduce((acc: Record<string, Team>, team: Team) => {
					acc[team.id] = team;
					return acc;
				}, {});
			}
		}

		return { fixtures, teams, week, weeks, currentWeek };
	} catch (err) {
		console.error('Error loading fixtures data:', err);
		throw error(500, { message: 'Failed to load fixtures data' });
	}
};
