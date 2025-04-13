import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { teams, fixtures } from '$lib/server/db/index';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

// Get API key from environment
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// Premier League ID in football-data.org API
const PREMIER_LEAGUE_ID = 'PL';

// API team and match interfaces
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
	id: number;
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
	};
}

/**
 * Delete fixtures for a specific week
 */
async function deleteFixturesByWeek(weekId: number): Promise<void> {
	await db.delete(fixtures).where(eq(fixtures.weekId, weekId));
}

/**
 * Script to seed fixtures for a specific season
 */
async function seedFixtures() {
	console.log('🔄 Seeding fixtures...');

	try {
		// Default to current season
		const season = process.argv[2] || '2024';

		// Check if API key exists
		if (!FOOTBALL_DATA_API_KEY) {
			throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
		}

		// First, fetch teams to get the mapping
		const TEAMS_API_URL = `https://api.football-data.org/v4/competitions/PL/teams`;
		const teamsResponse = await fetch(TEAMS_API_URL, {
			headers: {
				'X-Auth-Token': FOOTBALL_DATA_API_KEY
			}
		});

		if (!teamsResponse.ok) {
			throw new Error(`Teams API request failed with status ${teamsResponse.status}`);
		}

		const teamsData = await teamsResponse.json();
		const apiTeams = teamsData.teams || [];

		console.log(`Found ${apiTeams.length} teams from API`);

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
				console.warn(`Team not found in DB: ${apiTeam.name} (${tla})`);
			}
		}

		// Now fetch the matches from the API
		const MATCHES_API_URL = `https://api.football-data.org/v4/competitions/PL/matches?season=${season}`;
		const matchesResponse = await fetch(MATCHES_API_URL, {
			headers: {
				'X-Auth-Token': FOOTBALL_DATA_API_KEY
			}
		});

		if (!matchesResponse.ok) {
			throw new Error(`Matches API request failed with status ${matchesResponse.status}`);
		}

		const data = await matchesResponse.json();
		const apiMatches = data.matches || [];

		console.log(`Found ${apiMatches.length} matches from API`);

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
			console.log(`Processing week ${weekId}: ${matches.length} matches`);

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
						matchId: match.id.toString(),
						weekId: parseInt(weekId),
						homeTeamId,
						awayTeamId,
						homeScore,
						awayScore,
						matchDate: new Date(match.utcDate),
						status
					};
				})
				.filter((fixture): fixture is NonNullable<typeof fixture> => fixture !== null);

			// Insert fixtures into database
			if (fixtureValues.length > 0) {
				await db.insert(fixtures).values(fixtureValues);
				console.log(`Inserted ${fixtureValues.length} fixtures for week ${weekId}`);
			}
		}

		console.log(`✅ Successfully seeded fixtures for season ${season}`);
	} catch (error) {
		console.error('❌ Failed to seed fixtures:', error);
		process.exit(1);
	}
}

// Run the seed function
seedFixtures().catch(console.error);
