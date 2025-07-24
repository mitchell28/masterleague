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

// Interface for API team data
interface ApiTeam {
	id: number;
	name: string;
	shortName: string;
	tla: string;
	crest: string;
}

// API match interfaces
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
 * Update teams for the 2025 season
 */
async function updateTeamsFor2025() {
	console.log('🔄 Step 1: Updating teams for 2025 season...');

	// Check if API key exists
	if (!FOOTBALL_DATA_API_KEY) {
		throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
	}

	// Fetch teams from API for 2025 season
	const TEAMS_API_URL = `https://api.football-data.org/v4/competitions/${PREMIER_LEAGUE_ID}/teams?season=2025`;
	const response = await fetch(TEAMS_API_URL, {
		headers: {
			'X-Auth-Token': FOOTBALL_DATA_API_KEY
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch teams: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	const apiTeams: ApiTeam[] = data.teams || [];

	console.log(`📊 Found ${apiTeams.length} teams from API for 2025 season`);

	// Get existing teams from database
	const existingTeams = await db.select().from(teams);
	const existingTeamIds = new Set(existingTeams.map((team) => team.id));

	// Process API teams and identify new ones
	const newTeams: Array<{
		id: string;
		name: string;
		shortName: string;
		logo: string | null;
	}> = [];

	const updatedTeams: Array<{
		id: string;
		name: string;
		shortName: string;
		logo: string | null;
	}> = [];

	for (const apiTeam of apiTeams) {
		const teamId = apiTeam.tla.toLowerCase();
		const teamData = {
			id: teamId,
			name: apiTeam.name,
			shortName: apiTeam.tla,
			logo: apiTeam.crest || null
		};

		if (existingTeamIds.has(teamId)) {
			updatedTeams.push(teamData);
		} else {
			newTeams.push(teamData);
			console.log(`🆕 New team found: ${apiTeam.name} (${apiTeam.tla})`);
		}
	}

	// Insert new teams
	if (newTeams.length > 0) {
		await db.insert(teams).values(newTeams);
		console.log(`✅ Added ${newTeams.length} new teams to database`);
	}

	// Update existing teams
	for (const team of updatedTeams) {
		await db
			.update(teams)
			.set({
				name: team.name,
				shortName: team.shortName,
				logo: team.logo
			})
			.where(eq(teams.id, team.id));
	}

	if (updatedTeams.length > 0) {
		console.log(`✅ Updated ${updatedTeams.length} existing teams`);
	}

	console.log(`✅ Step 1 Complete: Teams synchronized for 2025 season`);
	return apiTeams;
}

/**
 * Delete fixtures for a specific week
 */
async function deleteFixturesByWeek(weekId: number): Promise<void> {
	await db.delete(fixtures).where(eq(fixtures.weekId, weekId));
}

/**
 * Set random multipliers for fixtures in a specific week (ORIGINAL LOGIC)
 * Only 1 fixture gets 3x points, 1 fixture gets 2x points, rest get 1x points
 */
async function setRandomMultipliersForWeek(weekId: number): Promise<void> {
	try {
		// Get all fixtures for the week
		const weekFixtures = await db.select().from(fixtures).where(eq(fixtures.weekId, weekId));

		if (weekFixtures.length === 0) {
			return;
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
	} catch (error) {
		console.error(`Error setting multipliers for week ${weekId}:`, error);
	}
}

/**
 * Seed fixtures for 2025 season
 */
async function seedFixturesFor2025(apiTeams: ApiTeam[]) {
	console.log('🔄 Step 2: Seeding fixtures for 2025 season...');

	// Get existing teams from our database
	const existingTeams = await db.select().from(teams);
	const existingTeamsByShortName: Record<string, (typeof existingTeams)[0]> = {};
	const existingTeamsByName: Record<string, (typeof existingTeams)[0]> = {};

	existingTeams.forEach((team) => {
		existingTeamsByShortName[team.shortName.toLowerCase()] = team;
		existingTeamsByName[team.name.toLowerCase()] = team;
	});

	// Create map of API team IDs to our team IDs
	const teamMap: Record<number, string> = {};

	// Map API teams to our team IDs with better matching
	for (const apiTeam of apiTeams) {
		const tla = apiTeam.tla.toLowerCase();
		const name = apiTeam.name.toLowerCase();

		// Try to match by TLA first, then by name
		if (existingTeamsByShortName[tla]) {
			teamMap[apiTeam.id] = existingTeamsByShortName[tla].id;
		} else if (existingTeamsByName[name]) {
			teamMap[apiTeam.id] = existingTeamsByName[name].id;
		} else {
			throw new Error(`Team not found in DB: ${apiTeam.name} (${tla})`);
		}
	}

	// Fetch 2025 matches from the API
	const MATCHES_API_URL = `https://api.football-data.org/v4/competitions/PL/matches?season=2025`;
	const matchesResponse = await fetch(MATCHES_API_URL, {
		headers: {
			'X-Auth-Token': FOOTBALL_DATA_API_KEY!
		}
	});

	if (!matchesResponse.ok) {
		throw new Error(`Matches API request failed with status ${matchesResponse.status}`);
	}

	const matchesData = await matchesResponse.json();
	const apiMatches = matchesData.matches || [];

	console.log(`📊 Found ${apiMatches.length} matches from API`);

	// Group matches by matchday
	const matchesByWeek: Record<string, ApiMatch[]> = {};
	for (const match of apiMatches) {
		const weekId = match.matchday;
		if (!matchesByWeek[weekId]) {
			matchesByWeek[weekId] = [];
		}
		matchesByWeek[weekId].push(match);
	}

	let totalInserted = 0;

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
					console.warn(`     ${match.homeTeam.name} vs ${match.awayTeam.name}`);
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
					status
				};
			})
			.filter((fixture): fixture is NonNullable<typeof fixture> => fixture !== null);

		// Insert fixtures into database
		if (fixtureValues.length > 0) {
			await db.insert(fixtures).values(fixtureValues);
			totalInserted += fixtureValues.length;
			console.log(`✅ Inserted ${fixtureValues.length} fixtures for week ${weekId}`);
		}
	}

	console.log(`✅ Step 2 Complete: Successfully seeded ${totalInserted} fixtures for 2025 season`);
}

/**
 * Main function to set up the entire 2025 season
 */
async function setup2025Season() {
	console.log('🏆 Setting up Premier League 2025 season...');
	console.log('========================================');

	try {
		// Step 1: Update teams
		const apiTeams = await updateTeamsFor2025();

		console.log(''); // Empty line for readability

		// Step 2: Seed fixtures
		await seedFixturesFor2025(apiTeams);

		console.log('');
		console.log('🎉 2025 Premier League season setup complete!');
		console.log('========================================');
		console.log('✅ Teams updated and synchronized');
		console.log('✅ All fixtures seeded for 38 weeks');
		console.log('✅ Ready for predictions!');
	} catch (error) {
		console.error('❌ Failed to set up 2025 season:', error);
		process.exit(1);
	}
}

// Run the setup function
setup2025Season().catch(console.error);
