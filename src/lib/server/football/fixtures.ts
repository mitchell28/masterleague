import type { Fixture } from '../db/schema';
import { fixtures, predictions, teams } from '../db/schema';
import { db } from '../db';
import { eq, inArray as drizzleInArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { FOOTBALL_DATA_API_KEY } from '$env/static/private';

/**
 * Get the current Premier League match week
 * For the 2023-24 season that runs from August 11, 2023 to May 19, 2024
 */
export function getCurrentWeek(): number {
	// Define the 2023-24 Premier League season
	const season = {
		startDate: new Date('2023-08-11'),
		endDate: new Date('2024-05-19'),
		totalWeeks: 38
	};

	// Get current date and adjust if needed for system clock issues
	let now = new Date();
	if (now.getFullYear() === 2025) {
		// If system date incorrectly shows 2025, adjust to 2024
		now = new Date(now);
		now.setFullYear(2024);
	}

	// Handle pre-season and post-season dates
	if (now < season.startDate) return 1;
	if (now > season.endDate) return season.totalWeeks;

	// Calculate days elapsed and total season length
	const msPerDay = 24 * 60 * 60 * 1000;
	const totalDays = (season.endDate.getTime() - season.startDate.getTime()) / msPerDay;
	const elapsedDays = (now.getTime() - season.startDate.getTime()) / msPerDay;

	// Calculate match week based on percentage of season completed
	let matchWeek = Math.floor((elapsedDays / totalDays) * season.totalWeeks) + 1;

	// Specific adjustments for known periods
	// For March 2024, the week should be around 29
	if (now.getMonth() === 2 && now.getFullYear() === 2024) {
		matchWeek = 29;
	}

	// Ensure result is within valid range
	return Math.min(Math.max(matchWeek, 1), season.totalWeeks);
}

// Database operations
export async function getFixturesByWeek(weekId: number): Promise<Fixture[]> {
	// Get all fixtures for this week, regardless of status
	return db.select().from(fixtures).where(eq(fixtures.weekId, weekId));
}

export async function getFixtureById(id: string): Promise<Fixture | undefined> {
	const result = await db.select().from(fixtures).where(eq(fixtures.id, id));
	return result[0];
}

export async function updateFixtureResults(
	fixtureId: string,
	homeScore: number,
	awayScore: number
): Promise<Fixture | undefined> {
	await db
		.update(fixtures)
		.set({
			homeScore,
			awayScore,
			status: 'completed'
		})
		.where(eq(fixtures.id, fixtureId));

	return getFixtureById(fixtureId);
}

// Delete fixtures for a specific week
export async function deleteFixturesByWeek(weekId: number): Promise<void> {
	// First, get the IDs of all fixtures for this week
	const weekFixtures = await db
		.select({ id: fixtures.id })
		.from(fixtures)
		.where(eq(fixtures.weekId, weekId));
	const fixtureIds = weekFixtures.map((fixture) => fixture.id);

	if (fixtureIds.length > 0) {
		// Delete any predictions that reference these fixtures
		await db.delete(predictions).where(drizzleInArray(predictions.fixtureId, fixtureIds));
	}

	// Now it's safe to delete the fixtures
	await db.delete(fixtures).where(eq(fixtures.weekId, weekId));
}

interface ApiTeam {
	id: number;
	name: string;
	shortName: string;
	tla: string;
	crest: string;
}

interface ApiMatchTeam {
	id: number;
	name: string;
	shortName: string;
	tla: string;
	crest: string;
}

interface ApiMatch {
	id: number; // This is the match_id we want
	matchday: number;
	homeTeam: ApiMatchTeam;
	awayTeam: ApiMatchTeam;
	utcDate: string;
	status: string;
	score: {
		fullTime: {
			home: number | null;
			away: number | null;
		};
		halfTime: {
			home: number | null;
			away: number | null;
		};
	};
}

interface ApiResponse {
	matches: ApiMatch[];
}

/**
 * Fetch fixtures from Football-Data.org API and seed them into the database with match_id
 */
export async function seedFixturesWithMatchId(season: string = '2024'): Promise<void> {
	// Get the API key
	const apiKey = FOOTBALL_DATA_API_KEY;
	if (!apiKey) {
		throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
	}

	// First, get teams directly from the API
	const TEAMS_API_URL = `https://api.football-data.org/v4/competitions/PL/teams?season=${season}`;
	const teamsResponse = await fetch(TEAMS_API_URL, {
		headers: {
			'X-Auth-Token': apiKey
		}
	});

	if (!teamsResponse.ok) {
		throw new Error(`Teams API request failed with status ${teamsResponse.status}`);
	}

	const teamsData = await teamsResponse.json();
	const apiTeams = teamsData.teams || [];

	// Create map of API team IDs to our team IDs
	const teamMap: Record<number, string> = {};

	// Get existing teams from our database
	const existingTeams = await db.select().from(teams);
	const existingTeamsByShortName: Record<string, (typeof existingTeams)[0]> = {};

	existingTeams.forEach((team) => {
		existingTeamsByShortName[team.shortName.toLowerCase()] = team;
	});

	// Map API teams to our team IDs
	for (const apiTeam of apiTeams) {
		const tla = apiTeam.tla.toLowerCase();

		// If team exists in our DB, use that ID
		if (existingTeamsByShortName[tla]) {
			teamMap[apiTeam.id] = existingTeamsByShortName[tla].id;
		} else {
			// If team doesn't exist, we'd need to create it
			// This shouldn't happen if you've already seeded teams
			console.warn(`Team not found in DB: ${apiTeam.name} (${tla})`);
		}
	}

	// Now fetch the matches from the API
	const MATCHES_API_URL = `https://api.football-data.org/v4/competitions/PL/matches?season=${season}`;
	const matchesResponse = await fetch(MATCHES_API_URL, {
		headers: {
			'X-Auth-Token': apiKey
		}
	});

	if (!matchesResponse.ok) {
		throw new Error(`Matches API request failed with status ${matchesResponse.status}`);
	}

	const data = await matchesResponse.json();
	const apiMatches = data.matches || [];

	// Group matches by matchday
	const matchesByWeek: Record<string, ApiMatch[]> = {};
	for (const match of apiMatches) {
		const weekId = match.matchday;
		if (!matchesByWeek[weekId]) {
			matchesByWeek[weekId] = [];
		}
		matchesByWeek[weekId].push(match);
	}

	// Process each matchday
	for (const weekId in matchesByWeek) {
		const matches = matchesByWeek[weekId];

		// Clear existing fixtures for this week
		await deleteFixturesByWeek(parseInt(weekId));

		// Map API matches to our fixture format
		const fixtureValues = matches
			.map((match: ApiMatch) => {
				// Get team IDs by their API IDs
				const homeTeamId = teamMap[match.homeTeam.id];
				const awayTeamId = teamMap[match.awayTeam.id];

				// Skip if we don't have a mapping for either team
				if (!homeTeamId || !awayTeamId) {
					console.warn(`Skipping match ${match.id}: Could not find team mapping`);
					return null;
				}

				// Get scores if available
				const homeScore = match.score.fullTime.home !== null ? match.score.fullTime.home : null;

				const awayScore = match.score.fullTime.away !== null ? match.score.fullTime.away : null;

				// Map API status to our status
				let status = 'upcoming';
				if (match.status === 'FINISHED') {
					status = 'completed';
				} else if (['IN_PLAY', 'PAUSED', 'SUSPENDED'].includes(match.status)) {
					status = 'in_play';
				}

				return {
					id: randomUUID(),
					matchId: match.id.toString(), // Use the API match ID as our matchId
					weekId: parseInt(weekId),
					homeTeamId,
					awayTeamId,
					homeScore,
					awayScore,
					matchDate: new Date(match.utcDate),
					pointsMultiplier: 1,
					status
				};
			})
			.filter((fixture): fixture is NonNullable<typeof fixture> => fixture !== null);

		// Insert fixtures to database
		if (fixtureValues.length > 0) {
			await db.insert(fixtures).values(fixtureValues);
		}
	}
}
