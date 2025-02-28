import type { Team } from '../db/schema';
import { teams } from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

export const premierLeagueTeams = [
	{
		id: 'arsenal',
		name: 'Arsenal',
		shortName: 'ARS',
		logo: 'https://resources.premierleague.com/premierleague/badges/t3.svg'
	},
	{
		id: 'aston-villa',
		name: 'Aston Villa',
		shortName: 'AVL',
		logo: 'https://resources.premierleague.com/premierleague/badges/t7.svg'
	},
	{
		id: 'bournemouth',
		name: 'Bournemouth',
		shortName: 'BOU',
		logo: 'https://resources.premierleague.com/premierleague/badges/t91.svg'
	},
	{
		id: 'brentford',
		name: 'Brentford',
		shortName: 'BRE',
		logo: 'https://resources.premierleague.com/premierleague/badges/t94.svg'
	},
	{
		id: 'brighton',
		name: 'Brighton',
		shortName: 'BHA',
		logo: 'https://resources.premierleague.com/premierleague/badges/t36.svg'
	},
	{
		id: 'chelsea',
		name: 'Chelsea',
		shortName: 'CHE',
		logo: 'https://resources.premierleague.com/premierleague/badges/t8.svg'
	},
	{
		id: 'crystal-palace',
		name: 'Crystal Palace',
		shortName: 'CRY',
		logo: 'https://resources.premierleague.com/premierleague/badges/t31.svg'
	},
	{
		id: 'everton',
		name: 'Everton',
		shortName: 'EVE',
		logo: 'https://resources.premierleague.com/premierleague/badges/t11.svg'
	},
	{
		id: 'fulham',
		name: 'Fulham',
		shortName: 'FUL',
		logo: 'https://resources.premierleague.com/premierleague/badges/t54.svg'
	},
	{
		id: 'ipswich',
		name: 'Ipswich Town',
		shortName: 'IPS',
		logo: 'https://resources.premierleague.com/premierleague/badges/t57.svg'
	},
	{
		id: 'leicester',
		name: 'Leicester City',
		shortName: 'LEI',
		logo: 'https://resources.premierleague.com/premierleague/badges/t13.svg'
	},
	{
		id: 'liverpool',
		name: 'Liverpool',
		shortName: 'LIV',
		logo: 'https://resources.premierleague.com/premierleague/badges/t14.svg'
	},
	{
		id: 'man-city',
		name: 'Manchester City',
		shortName: 'MCI',
		logo: 'https://resources.premierleague.com/premierleague/badges/t43.svg'
	},
	{
		id: 'man-utd',
		name: 'Manchester United',
		shortName: 'MUN',
		logo: 'https://resources.premierleague.com/premierleague/badges/t1.svg'
	},
	{
		id: 'newcastle',
		name: 'Newcastle United',
		shortName: 'NEW',
		logo: 'https://resources.premierleague.com/premierleague/badges/t4.svg'
	},
	{
		id: 'nottm-forest',
		name: 'Nottingham Forest',
		shortName: 'NFO',
		logo: 'https://resources.premierleague.com/premierleague/badges/t17.svg'
	},
	{
		id: 'southampton',
		name: 'Southampton',
		shortName: 'SOU',
		logo: 'https://resources.premierleague.com/premierleague/badges/t20.svg'
	},
	{
		id: 'tottenham',
		name: 'Tottenham Hotspur',
		shortName: 'TOT',
		logo: 'https://resources.premierleague.com/premierleague/badges/t6.svg'
	},
	{
		id: 'west-ham',
		name: 'West Ham United',
		shortName: 'WHU',
		logo: 'https://resources.premierleague.com/premierleague/badges/t21.svg'
	},
	{
		id: 'wolves',
		name: 'Wolverhampton',
		shortName: 'WOL',
		logo: 'https://resources.premierleague.com/premierleague/badges/t39.svg'
	}
];

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

	// Insert teams
	await db.insert(teams).values(premierLeagueTeams);
}

// Get the "big 6" teams (for generating interesting fixtures)
export function getBigSixTeams(): string[] {
	return ['arsenal', 'chelsea', 'liverpool', 'man-city', 'man-utd', 'tottenham'];
}

// Get top teams for interesting fixtures (this is subjective and can be updated)
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
