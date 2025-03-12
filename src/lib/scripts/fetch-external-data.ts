import * as dotenv from 'dotenv';
import './db-connection'; // Import this first to set up the environment

// Load environment variables from .env file
dotenv.config();

// Get API key from environment
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

/**
 * Script to fetch data from external football API and store in database
 */
async function fetchExternalData() {
	console.log('🔄 Fetching external football data...');

	try {
		// Fetch teams data from external API
		await fetchTeams();

		// Fetch fixtures data from external API
		await fetchFixtures();

		console.log('✅ External data fetch completed successfully!');
	} catch (error) {
		console.error('❌ External data fetch failed:', error);
		process.exit(1);
	}
}

/**
 * Fetch teams data from external API
 */
async function fetchTeams() {
	console.log('⚽ Fetching teams data...');

	try {
		// Check if API key exists
		if (!FOOTBALL_DATA_API_KEY) {
			throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
		}

		const response = await fetch('https://api.football-data.org/v4/competitions/PL/teams', {
			headers: {
				'X-Auth-Token': FOOTBALL_DATA_API_KEY
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch teams: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		// Process and store teams data
		console.log(`Found ${data.teams.length} teams`);

		// Insert teams into database
		// Implementation would go here

		console.log('✅ Teams data fetch completed');
	} catch (error) {
		console.error('❌ Teams data fetch failed:', error);
		throw error;
	}
}

/**
 * Fetch fixtures data from external API
 */
async function fetchFixtures() {
	console.log('📅 Fetching fixtures data...');

	try {
		// Check if API key exists
		if (!FOOTBALL_DATA_API_KEY) {
			throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
		}

		const response = await fetch('https://api.football-data.org/v4/competitions/PL/matches', {
			headers: {
				'X-Auth-Token': FOOTBALL_DATA_API_KEY
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch fixtures: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		// Process and store fixtures data
		console.log(`Found ${data.matches.length} fixtures`);

		// Insert fixtures into database
		// Implementation would go here

		console.log('✅ Fixtures data fetch completed');
	} catch (error) {
		console.error('❌ Fixtures data fetch failed:', error);
		throw error;
	}
}

// Run the fetch function
fetchExternalData().catch(console.error);
