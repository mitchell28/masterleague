import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { teams } from '../lib/server/db/schema';
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
const API_URL = `https://api.football-data.org/v4/competitions/${PREMIER_LEAGUE_ID}/teams`;

/**
 * Script to initialize the database with Premier League teams
 */
async function initTeams() {
	console.log('🔄 Initializing database with Premier League teams...');

	try {
		// Check if teams already exist
		const existingTeams = await db.select().from(teams);
		if (existingTeams.length > 0) {
			console.log('✅ Teams already exist in the database');
			return;
		}

		// Check if API key exists
		if (!FOOTBALL_DATA_API_KEY) {
			throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
		}

		// Fetch teams from API
		const response = await fetch(API_URL, {
			headers: {
				'X-Auth-Token': FOOTBALL_DATA_API_KEY
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch teams: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		// Process and store teams data
		const teamInserts = data.teams.map((team: any) => ({
			id: team.tla.toLowerCase(),
			name: team.name,
			shortName: team.shortName,
			crest: team.crest
		}));

		// Insert teams into database
		await db.insert(teams).values(teamInserts);

		console.log(`✅ Database initialized with ${teamInserts.length} Premier League teams`);
	} catch (error) {
		console.error('❌ Failed to initialize database:', error);
		process.exit(1);
	}
}

// Run the initialization function
initTeams().catch(console.error);
