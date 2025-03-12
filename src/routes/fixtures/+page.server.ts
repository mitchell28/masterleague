import { error } from '@sveltejs/kit';
import type { Team } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { fixtures } from '$lib/server/db/schema';
import { getCurrentWeek, getFixturesByWeek } from '$lib/server/football/fixtures';
import { getAllTeams } from '$lib/server/football/teams';
import { processFixtureResults } from '$lib/server/football/predictions';
import { FOOTBALL_DATA_API_KEY } from '$env/static/private';
import { eq, and, lt, or } from 'drizzle-orm';

// Football-data.org API endpoint for Premier League matches
const PL_MATCHES_API = 'https://api.football-data.org/v4/competitions/PL/matches';

export const load: PageServerLoad = async ({ url }) => {
	try {
		// Get week from URL params
		const requestedWeek = url.searchParams.get('week');

		// Get current week
		const currentWeek = getCurrentWeek();

		// Get all distinct week IDs
		const result = await db
			.select({ weekId: fixtures.weekId })
			.from(fixtures)
			.groupBy(fixtures.weekId)
			.orderBy(fixtures.weekId);

		const weeks = result.map((row) => row.weekId);

		// Determine which week to load
		let weekToLoad = currentWeek;
		if (requestedWeek) {
			const parsedWeek = parseInt(requestedWeek);
			if (weeks.includes(parsedWeek)) {
				weekToLoad = parsedWeek;
			}
		}

		// Get fixtures for the selected week
		const fixturesData = await getFixturesByWeek(weekToLoad);

		// Get team data if we have fixtures
		let teams: Record<string, Team> = {};
		if (fixturesData.length > 0) {
			const teamsData = await getAllTeams();

			teams = teamsData.reduce((acc: Record<string, Team>, team: Team) => {
				acc[team.id] = team;
				return acc;
			}, {});
		}

		return {
			fixtures: fixturesData,
			teams,
			week: weekToLoad,
			weeks,
			currentWeek
		};
	} catch (err) {
		console.error('Error loading fixtures data:', err);
		throw error(500, { message: 'Failed to load fixtures data' });
	}
};

// Helper function to update fixture with specific status
async function updateFixtureStatus(
	fixtureId: string,
	homeScore: number,
	awayScore: number,
	status: 'in_play' | 'completed'
) {
	await db
		.update(fixtures)
		.set({
			homeScore,
			awayScore,
			status
		})
		.where(eq(fixtures.id, fixtureId));
}

// Add actions for updating fixtures
export const actions: Actions = {
	checkUpdates: async () => {
		try {
			// Find fixtures that are scheduled or in_play, and where the match date has passed
			const now = new Date();
			const pendingFixtures = await db
				.select()
				.from(fixtures)
				.where(
					and(
						or(eq(fixtures.status, 'scheduled'), eq(fixtures.status, 'in_play')),
						lt(fixtures.matchDate, now)
					)
				);

			if (pendingFixtures.length === 0) {
				return { success: true, message: 'No fixtures need updating', updated: 0 };
			}

			// Get the API key
			const apiKey = FOOTBALL_DATA_API_KEY;
			if (!apiKey) {
				throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
			}

			// Fetch matches from the API
			const response = await fetch(PL_MATCHES_API, {
				headers: {
					'X-Auth-Token': apiKey
				}
			});

			if (!response.ok) {
				throw new Error(`API request failed with status ${response.status}`);
			}

			const data = await response.json();
			const apiMatches = data.matches || [];

			// Map our fixture IDs to team IDs
			const teamIdMap = new Map();
			pendingFixtures.forEach((fixture) => {
				// Create a key using home and away team IDs
				const key = `${fixture.homeTeamId}_${fixture.awayTeamId}`;
				teamIdMap.set(key, fixture.id);
			});

			let updatedCount = 0;
			let completedCount = 0;
			let inPlayCount = 0;

			// Process each match from the API
			for (const match of apiMatches) {
				// Get team TLAs (short names)
				const homeTeamTla = match.homeTeam.tla.toLowerCase();
				const awayTeamTla = match.awayTeam.tla.toLowerCase();

				// Create the key to lookup our fixture
				const key = `${homeTeamTla}_${awayTeamTla}`;
				const fixtureId = teamIdMap.get(key);

				if (fixtureId) {
					// Get scores
					const homeScore =
						match.score.fullTime.home !== null
							? match.score.fullTime.home
							: match.score.halfTime.home;
					const awayScore =
						match.score.fullTime.away !== null
							? match.score.fullTime.away
							: match.score.halfTime.away;

					if (homeScore !== null && awayScore !== null) {
						if (match.status === 'FINISHED') {
							// Match is finished - update and process predictions
							await updateFixtureStatus(fixtureId, homeScore, awayScore, 'completed');
							await processFixtureResults(fixtureId);
							completedCount++;
						} else if (['IN_PLAY', 'PAUSED', 'SUSPENDED'].includes(match.status)) {
							// Match is in progress - just update scores with in_play status
							await updateFixtureStatus(fixtureId, homeScore, awayScore, 'in_play');
							inPlayCount++;
						}

						updatedCount++;
					}
				}
			}

			return {
				success: true,
				message: `Updated ${updatedCount} fixtures (${completedCount} completed, ${inPlayCount} in-play)`,
				updated: updatedCount,
				completed: completedCount,
				inPlay: inPlayCount
			};
		} catch (error) {
			console.error('Failed to check for fixture updates:', error);
			return {
				success: false,
				message: 'Failed to check for fixture updates'
			};
		}
	}
};
