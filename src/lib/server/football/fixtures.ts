import type { Fixture } from '../db/schema';
import { fixtures, predictions } from '../db/schema';
import { db } from '../db';
import { eq, and, desc, gt, inArray as drizzleInArray } from 'drizzle-orm';
import { getBigSixTeams, getTopTeams } from './teams';
import { randomUUID } from 'crypto';

// Get current week number
export function getCurrentWeek(): number {
	// For simplicity, we'll use a calculation based on the current date
	const now = new Date();
	const startDate = new Date(now.getFullYear(), 0, 1);
	const days = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
	return Math.ceil(days / 7);
}

// Database operations
export async function getFixturesByWeek(weekId: number): Promise<Fixture[]> {
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

// Fixture generation
export async function generateFixturesForCurrentWeek(
	forceRegenerate: boolean = false
): Promise<Fixture[]> {
	const weekId = getCurrentWeek();

	// Check if fixtures already exist for this week
	const existingFixtures = await getFixturesByWeek(weekId);
	if (existingFixtures.length > 0) {
		// If forceRegenerate is true, delete existing fixtures
		if (forceRegenerate) {
			await deleteFixturesByWeek(weekId);
		} else {
			return existingFixtures;
		}
	}

	// Generate fixtures and save to database
	const newFixtures = generateInterestingFixtures();
	const fixtureEntities = createFixtureEntities(newFixtures, weekId);
	await db.insert(fixtures).values(fixtureEntities);

	return getFixturesByWeek(weekId);
}

function createFixtureEntities(
	newFixtures: Array<{
		homeTeamId: string;
		awayTeamId: string;
		matchDate: Date;
		pointsMultiplier: number;
	}>,
	weekId: number
) {
	return newFixtures.map((fixture) => ({
		id: randomUUID(),
		weekId,
		homeTeamId: fixture.homeTeamId,
		awayTeamId: fixture.awayTeamId,
		matchDate: new Date(fixture.matchDate.getTime()),
		pointsMultiplier: fixture.pointsMultiplier,
		status: 'upcoming'
	}));
}

// Premier League teams
const allPremierLeagueTeams = [
	'arsenal',
	'aston-villa',
	'bournemouth',
	'brentford',
	'brighton',
	'chelsea',
	'crystal-palace',
	'everton',
	'fulham',
	'ipswich',
	'leicester',
	'liverpool',
	'man-city',
	'man-utd',
	'newcastle',
	'nottm-forest',
	'southampton',
	'tottenham',
	'west-ham',
	'wolves'
];

// Fixture generation logic
function generateInterestingFixtures(): Array<{
	homeTeamId: string;
	awayTeamId: string;
	matchDate: Date;
	pointsMultiplier: number;
}> {
	const bigSixTeams = getBigSixTeams();
	const topTeams = getTopTeams();

	// Create a copy of the teams array that we can modify
	const availableTeams = [...allPremierLeagueTeams];
	const fixtures = [];

	// Calculate base dates
	const { saturday, sundayDate } = calculateMatchDates();

	// Generate special fixtures
	const triplePointsFixture = createTriplePointsFixture(bigSixTeams, availableTeams, saturday);
	fixtures.push(triplePointsFixture);

	const doublePointsFixture = createDoublePointsFixture(topTeams, availableTeams, sundayDate);
	fixtures.push(doublePointsFixture);

	// Generate regular fixtures
	const regularFixtures = createRegularFixtures(availableTeams, saturday);
	fixtures.push(...regularFixtures);

	return fixtures;
}

function calculateMatchDates() {
	const now = new Date();
	const saturday = new Date(now);
	saturday.setDate(now.getDate() + (6 - now.getDay())); // Next Saturday
	saturday.setHours(15, 0, 0, 0); // 3 PM

	const sundayDate = new Date(saturday);
	sundayDate.setDate(saturday.getDate() + 1); // Sunday

	return { saturday, sundayDate };
}

function createTriplePointsFixture(
	bigSixTeams: string[],
	availableTeams: string[],
	saturday: Date
) {
	const tripleHomeTeam = getRandomTeamFromArray(bigSixTeams);
	const tripleAwayTeamOptions = bigSixTeams.filter((team) => team !== tripleHomeTeam);
	const tripleAwayTeam = getRandomTeamFromArray(tripleAwayTeamOptions);

	// Remove used teams
	removeFromArray(availableTeams, tripleHomeTeam);
	removeFromArray(availableTeams, tripleAwayTeam);

	return {
		homeTeamId: tripleHomeTeam,
		awayTeamId: tripleAwayTeam,
		matchDate: new Date(saturday.getTime()),
		pointsMultiplier: 3
	};
}

function createDoublePointsFixture(topTeams: string[], availableTeams: string[], sundayDate: Date) {
	const doubleHomeTeam = getRandomTeamFromArray(
		topTeams.filter((team) => availableTeams.includes(team))
	);
	const doubleAwayTeamOptions = availableTeams.filter((team) => !topTeams.includes(team));
	const doubleAwayTeam = getRandomTeamFromArray(doubleAwayTeamOptions);

	// Remove used teams
	removeFromArray(availableTeams, doubleHomeTeam);
	removeFromArray(availableTeams, doubleAwayTeam);

	return {
		homeTeamId: doubleHomeTeam,
		awayTeamId: doubleAwayTeam,
		matchDate: new Date(sundayDate.getTime()),
		pointsMultiplier: 2
	};
}

function createRegularFixtures(availableTeams: string[], saturday: Date) {
	const fixtures = [];

	for (let i = 0; i < 3; i++) {
		const homeTeam = getRandomTeamFromArray(availableTeams);
		removeFromArray(availableTeams, homeTeam);

		const awayTeam = getRandomTeamFromArray(availableTeams);
		removeFromArray(availableTeams, awayTeam);

		const matchDate = new Date(saturday);
		matchDate.setDate(saturday.getDate() + (i % 2)); // Alternate between Saturday and Sunday
		matchDate.setHours(15 + ((i * 2) % 4), 0, 0, 0); // Vary the time

		fixtures.push({
			homeTeamId: homeTeam,
			awayTeamId: awayTeam,
			matchDate,
			pointsMultiplier: 1
		});
	}

	return fixtures;
}

// Utility functions
function getRandomTeamFromArray(teams: string[]): string {
	return teams[Math.floor(Math.random() * teams.length)];
}

function removeFromArray(teams: string[], teamToRemove: string): void {
	const index = teams.indexOf(teamToRemove);
	if (index !== -1) {
		teams.splice(index, 1);
	}
}
