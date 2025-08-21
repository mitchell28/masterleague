import * as dotenv from 'dotenv';
import { teams } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';

// Load environment variables from .env file
dotenv.config();

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

/**
 * Script to initialize/update the database with Premier League teams for the current season
 */
async function initTeams() {
	console.log('🔄 Updating database with 2025 Premier League teams...');

	try {
		// Get command line argument for season, default to 2025
		const season = process.argv[2] || '2025-26';
		console.log(`📅 Fetching teams for ${season} season...`);

		// Check if API key exists
		if (!FOOTBALL_DATA_API_KEY) {
			throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
		}

		// Fetch teams from API for the specific season
		const API_URL = `https://api.football-data.org/v4/competitions/${PREMIER_LEAGUE_ID}/teams?season=${season}`;
		const response = await fetch(API_URL, {
			headers: {
				'X-Auth-Token': FOOTBALL_DATA_API_KEY
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch teams: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		const apiTeams: ApiTeam[] = data.teams || [];

		console.log(`📊 Found ${apiTeams.length} teams from API for ${season} season`);

		// Get existing teams from database
		const existingTeams = await db.select().from(teams);
		const existingTeamIds = new Set(existingTeams.map((team) => team.id));

		console.log(`📊 Found ${existingTeams.length} existing teams in database`);

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
				// Team exists, add to update list
				updatedTeams.push(teamData);
			} else {
				// New team, add to insert list
				newTeams.push(teamData);
				console.log(`🆕 New team found: ${apiTeam.name} (${apiTeam.tla})`);
			}
		}

		// Insert new teams
		if (newTeams.length > 0) {
			await db.insert(teams).values(newTeams);
			console.log(`✅ Added ${newTeams.length} new teams to database`);
		}

		// Update existing teams (in case names or logos changed)
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

		console.log(`✅ Database synchronized with ${season} Premier League teams`);
		console.log(`📊 Total teams in database: ${existingTeams.length + newTeams.length}`);

		// List all teams for verification
		const allTeams = await db.select().from(teams);
		console.log('\n📋 Current teams in database:');
		allTeams.forEach((team) => {
			const isNew = newTeams.some((newTeam) => newTeam.id === team.id);
			console.log(`   ${isNew ? '🆕' : '  '} ${team.shortName} - ${team.name}`);
		});
	} catch (error) {
		console.error('❌ Failed to update teams:', error);
		process.exit(1);
	}
}

// Run the initialization function
initTeams().catch(console.error);
