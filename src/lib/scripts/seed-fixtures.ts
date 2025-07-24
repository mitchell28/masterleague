import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { teams, fixtures } from '../../../drizzle/schema';
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
 * Set random multipliers for fixtures in a specific week (OLD LOGIC)
 * Only 1 fixture gets 3x points, 1 fixture gets 2x points, rest get 1x points
 */
async function setRandomMultipliersForWeek(weekId: number): Promise<void> {
	try {
		// Get all fixtures for the week
		const weekFixtures = await db.select().from(fixtures).where(eq(fixtures.weekId, weekId));

		if (weekFixtures.length === 0) {
			return;
		}

		// Check if there are already special multipliers set for this week
		const specialMultipliers = weekFixtures.filter((fixture) => fixture.pointsMultiplier > 1);

		// If special multipliers already exist, reset all to 1 first
		if (specialMultipliers.length > 0) {
			console.log(
				`   Resetting multipliers for week ${weekId} - found ${specialMultipliers.length} special multipliers`
			);
			await db.update(fixtures).set({ pointsMultiplier: 1 }).where(eq(fixtures.weekId, weekId));
		}

		// Choose one fixture for triple points (3x)
		const triplePointsIndex = Math.floor(Math.random() * weekFixtures.length);

		// Choose one different fixture for double points (2x)
		let doublePointsIndex;
		do {
			doublePointsIndex = Math.floor(Math.random() * weekFixtures.length);
		} while (doublePointsIndex === triplePointsIndex);

		// Update the chosen fixtures with their multipliers
		await db
			.update(fixtures)
			.set({ pointsMultiplier: 3 })
			.where(eq(fixtures.id, weekFixtures[triplePointsIndex].id));

		await db
			.update(fixtures)
			.set({ pointsMultiplier: 2 })
			.where(eq(fixtures.id, weekFixtures[doublePointsIndex].id));

		console.log(
			`   ✨ Set multipliers for week ${weekId}: 1 fixture with 3x points, 1 fixture with 2x points`
		);
	} catch (error) {
		console.error(`   ❌ Error setting multipliers for week ${weekId}:`, error);
	}
}

/**
 * Script to seed fixtures for a specific season
 */
async function seedFixtures() {
	console.log('🔄 Seeding fixtures...');

	try {
		// Default to 2025 season, allow override with command line argument
		const season = process.argv[2] || '2025';
		console.log(`📅 Seeding fixtures for ${season} season...`);

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
		const existingTeamsByName: Record<string, (typeof existingTeams)[0]> = {};

		existingTeams.forEach((team) => {
			existingTeamsByShortName[team.shortName.toLowerCase()] = team;
			existingTeamsByName[team.name.toLowerCase()] = team;
		});

		console.log(`📊 Found ${existingTeams.length} teams in database:`);
		existingTeams.forEach((team) => {
			console.log(`   ${team.shortName} - ${team.name}`);
		});

		// Map API teams to our team IDs with better matching
		for (const apiTeam of apiTeams) {
			const tla = apiTeam.tla.toLowerCase();
			const name = apiTeam.name.toLowerCase();

			// Try to match by TLA first, then by name
			if (existingTeamsByShortName[tla]) {
				teamMap[apiTeam.id] = existingTeamsByShortName[tla].id;
				console.log(
					`✅ Mapped ${apiTeam.name} (${apiTeam.tla}) -> ${existingTeamsByShortName[tla].id}`
				);
			} else if (existingTeamsByName[name]) {
				teamMap[apiTeam.id] = existingTeamsByName[name].id;
				console.log(`✅ Mapped ${apiTeam.name} (by name) -> ${existingTeamsByName[name].id}`);
			} else {
				console.error(`❌ Team not found in DB: ${apiTeam.name} (${tla})`);
				console.log('   Available teams:', Object.keys(existingTeamsByShortName));
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
						console.warn(`⚠️  Skipping match ${match.id}: Missing team mapping`);
						console.warn(
							`     ${match.homeTeam.name} (${match.homeTeam.tla}) vs ${match.awayTeam.name} (${match.awayTeam.tla})`
						);
						console.warn(
							`     Home team mapped: ${!!homeTeamId}, Away team mapped: ${!!awayTeamId}`
						);
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
						matchDate: match.utcDate, // Keep as string since schema expects string
						pointsMultiplier: 1, // Default multiplier, will be updated after insertion
						status
					};
				})
				.filter((fixture): fixture is NonNullable<typeof fixture> => fixture !== null);

			// Insert fixtures into database
			if (fixtureValues.length > 0) {
				await db.insert(fixtures).values(fixtureValues);
				console.log(`Inserted ${fixtureValues.length} fixtures for week ${weekId}`);

				// Set random multipliers for this week's fixtures
				await setRandomMultipliersForWeek(parseInt(weekId));
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
