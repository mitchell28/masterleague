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
	status: string; // API statuses: SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED
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

// Set random multipliers for fixtures in a specific week
export async function setRandomMultipliersForWeek(weekId: number): Promise<void> {
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
				`Resetting multipliers for week ${weekId} - found ${specialMultipliers.length} special multipliers`
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
			`Set multipliers for week ${weekId}: 3x for fixture ${weekFixtures[triplePointsIndex].id}, 2x for fixture ${weekFixtures[doublePointsIndex].id}`
		);
	} catch (error) {
		console.error(`Error setting multipliers for week ${weekId}:`, error);
	}
}

/**
 * Map API status to our database status
 */
export function mapApiStatusToDbStatus(apiStatus: string): string {
	// API statuses: SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED
	// DB statuses: upcoming, live, completed

	switch (apiStatus) {
		case 'FINISHED':
			return 'completed';
		case 'IN_PLAY':
		case 'PAUSED':
		case 'SUSPENDED':
			return 'live';
		case 'SCHEDULED':
		case 'TIMED':
		case 'POSTPONED':
		default:
			return 'upcoming';
	}
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

				// Map API status to our status using the new function
				const status = mapApiStatusToDbStatus(match.status);

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

			// Set random multipliers for this week's fixtures
			await setRandomMultipliersForWeek(parseInt(weekId));
		}
	}
}

// Update multipliers for the current week's fixtures
export async function updateCurrentWeekMultipliers(): Promise<boolean> {
	try {
		const currentWeek = getCurrentWeek();
		await setRandomMultipliersForWeek(currentWeek);
		return true;
	} catch (error) {
		console.error('Error updating current week multipliers:', error);
		return false;
	}
}

export async function updateAllWeekMultipliers(): Promise<boolean> {
	try {
		for (let week = 1; week <= 38; week++) {
			console.log(`Updating multipliers for week ${week}`);
			await setRandomMultipliersForWeek(week);
		}
		return true;
	} catch (error) {
		console.error('Error updating all week multipliers:', error);
		return false;
	}
}

/**
 * Fetch current status of fixtures from the football API and update the database
 */
export async function updateFixtureStatuses(
	fixtureIds: string[] = []
): Promise<{ updated: number; live: number }> {
	// Get the API key
	const apiKey = FOOTBALL_DATA_API_KEY;
	if (!apiKey) {
		throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
	}

	// Simple in-memory cache implementation
	// This will be local to this instance of the server
	const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache TTL
	const apiCache: Record<string, { data: any; timestamp: number }> = {};

	// Determine which fixtures to check
	let fixturesToCheck: (typeof fixtures.$inferSelect)[] = [];

	if (fixtureIds.length > 0) {
		// If specific fixture IDs are provided, use those
		fixturesToCheck = await db
			.select()
			.from(fixtures)
			.where(drizzleInArray(fixtures.id, fixtureIds));
	} else {
		// Check all fixtures that are not FINISHED
		fixturesToCheck = await db
			.select()
			.from(fixtures)
			.where(
				drizzleInArray(fixtures.status, [
					'SCHEDULED',
					'TIMED',
					'IN_PLAY',
					'PAUSED',
					'SUSPENDED',
					'POSTPONED'
				])
			);
	}

	if (fixturesToCheck.length === 0) {
		return { updated: 0, live: 0 };
	}

	// Get fixtures with matchId to query the Football Data API
	const fixturesWithMatchId = fixturesToCheck.filter((f) => f.matchId != null);

	if (fixturesWithMatchId.length === 0) {
		return { updated: 0, live: 0 };
	}

	// Get unique match IDs to check
	const matchIds = [...new Set(fixturesWithMatchId.map((f) => f.matchId).filter(Boolean))];

	// Create a map to look up fixtures by match ID
	const fixturesByMatchId = fixturesWithMatchId.reduce(
		(acc, fixture) => {
			if (fixture.matchId) {
				acc[fixture.matchId] = fixture;
			}
			return acc;
		},
		{} as Record<string, typeof fixtures.$inferSelect>
	);

	// Fetch current status for these matches
	let updatedCount = 0;
	let liveCount = 0;

	// Process fixtures in batches to respect API rate limits (10 calls per minute)
	const batchSize = 5; // Process 5 matches per API call
	const callsPerMinute = 10;
	const callInterval = 60000 / callsPerMinute; // Time between API calls in ms (6000ms)

	// Track API call timestamps to manage rate limiting
	const apiCallTimestamps: number[] = [];

	for (let i = 0; i < matchIds.length; i += batchSize) {
		const batchIds = matchIds.slice(i, i + batchSize);
		const matchIdsParam = batchIds.join(',');

		// Generate cache key for this batch
		const cacheKey = `matches_${matchIdsParam}`;
		const now = Date.now();
		let apiMatches;

		// Check cache first
		if (apiCache[cacheKey] && now - apiCache[cacheKey].timestamp < CACHE_TTL) {
			console.log(`Using cached data for matches: ${matchIdsParam}`);
			apiMatches = apiCache[cacheKey].data;
		} else {
			// Check if we need to wait before making another API call
			apiCallTimestamps.push(now);

			// Remove timestamps older than 1 minute
			const oneMinuteAgo = now - 60000;
			while (apiCallTimestamps.length > 0 && apiCallTimestamps[0] < oneMinuteAgo) {
				apiCallTimestamps.shift();
			}

			// If we've made 10 calls in the last minute, wait until we can make another
			if (apiCallTimestamps.length >= callsPerMinute) {
				const oldestCall = apiCallTimestamps[0];
				const timeToWait = Math.max(oldestCall + 60000 - now, 0);

				if (timeToWait > 0) {
					console.log(`Rate limit approaching. Waiting ${timeToWait}ms before next API call`);
					await new Promise((resolve) => setTimeout(resolve, timeToWait));
				}
			} else if (i > 0) {
				// Add a small delay between calls even if we haven't hit the limit
				await new Promise((resolve) => setTimeout(resolve, callInterval));
			}

			try {
				// Fetch match data
				const MATCHES_API_URL = `https://api.football-data.org/v4/matches?ids=${matchIdsParam}`;
				const matchesResponse = await fetch(MATCHES_API_URL, {
					headers: {
						'X-Auth-Token': apiKey
					}
				});

				if (matchesResponse.status === 429) {
					// If we hit rate limit despite our precautions, wait a full minute
					console.warn('Rate limit hit (429). Waiting 60 seconds before continuing.');
					await new Promise((resolve) => setTimeout(resolve, 60000));

					// Retry this batch by decrementing i
					i -= batchSize;
					continue;
				}

				if (!matchesResponse.ok) {
					console.error(`Matches API request failed with status ${matchesResponse.status}`);
					continue;
				}

				const data = await matchesResponse.json();
				apiMatches = data.matches || [];

				// Store in cache
				apiCache[cacheKey] = {
					data: apiMatches,
					timestamp: now
				};
			} catch (error) {
				console.error(`Error fetching match data for batch ${i}:`, error);
				continue;
			}
		}

		// Update fixtures based on API response
		for (const match of apiMatches) {
			const fixture = fixturesByMatchId[match.id.toString()];
			if (!fixture) continue;

			// Use the API status directly
			const fixtureStatus = match.status;

			// Count live fixtures
			if (fixtureStatus === 'IN_PLAY' || fixtureStatus === 'PAUSED') {
				liveCount++;
			}

			// Get scores if available
			const homeScore =
				match.score.fullTime.home !== null
					? match.score.fullTime.home
					: match.score.halfTime.home !== null
						? match.score.halfTime.home
						: null;
			const awayScore =
				match.score.fullTime.away !== null
					? match.score.fullTime.away
					: match.score.halfTime.away !== null
						? match.score.halfTime.away
						: null;

			// Only update if there's a change in status or score
			if (
				fixtureStatus !== fixture.status ||
				(homeScore !== null && homeScore !== fixture.homeScore) ||
				(awayScore !== null && awayScore !== fixture.awayScore)
			) {
				// Update the fixture in the database
				await db
					.update(fixtures)
					.set({
						status: fixtureStatus,
						homeScore: homeScore !== null ? homeScore : fixture.homeScore,
						awayScore: awayScore !== null ? awayScore : fixture.awayScore,
						lastUpdated: new Date()
					})
					.where(eq(fixtures.id, fixture.id));

				updatedCount++;

				// Process predictions if the match is completed
				if (fixtureStatus === 'FINISHED' && homeScore !== null && awayScore !== null) {
					try {
						// Import here to avoid circular dependency
						const { processPredictionsForFixture } = await import('./predictions');
						await processPredictionsForFixture(fixture.id, homeScore, awayScore);
					} catch (error) {
						console.error(`Error processing predictions for fixture ${fixture.id}:`, error);
					}
				}
			}
		}
	}

	return { updated: updatedCount, live: liveCount };
}
