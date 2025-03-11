import type { Team } from '../db/schema';
import { teams } from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { FOOTBALL_DATA_API_KEY } from '$env/static/private';

interface ApiTeam {
	id: number;
	name: string;
	shortName: string;
	tla: string;
	crest: string;
}

interface ApiResponse {
	teams: ApiTeam[];
}

// Premier League ID in football-data.org API
const PREMIER_LEAGUE_ID = 'PL';
const API_URL = `https://api.football-data.org/v4/competitions/${PREMIER_LEAGUE_ID}/teams`;

// Get team by ID
export async function getTeamById(id: string): Promise<Team | undefined> {
	const result = await db.select().from(teams).where(eq(teams.id, id));
	return result[0];
}

// Get all teams
export async function getAllTeams(): Promise<Team[]> {
	return db.select().from(teams);
}

// Initialize Premier League teams in the database
export async function initializeTeams(): Promise<void> {
	// Check if teams already exist
	const existingTeams = await getAllTeams();
	if (existingTeams.length > 0) {
		return;
	}

	// Fetch teams from API
	const apiKey = FOOTBALL_DATA_API_KEY;
	if (!apiKey) {
		throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
	}

	const response = await fetch(API_URL, {
		headers: {
			'X-Auth-Token': apiKey
		}
	});

	if (!response.ok) {
		throw new Error(`API request failed with status ${response.status}`);
	}

	const data = (await response.json()) as ApiResponse;

	// Transform API response to our Team format and insert teams
	const premierLeagueTeams = data.teams.map((team) => ({
		id: team.tla.toLowerCase(),
		name: team.name,
		shortName: team.tla,
		logo: team.crest
	}));

	// Insert teams
	await db.insert(teams).values(premierLeagueTeams);
}

// Get top teams for interesting fixtures
export function getTopTeams(): string[] {
	return [
		'arsenal',
		'chelsea',
		'liverpool',
		'man-city',
		'man-utd',
		'tottenham',
		'aston-villa',
		'newcastle'
	];
}
