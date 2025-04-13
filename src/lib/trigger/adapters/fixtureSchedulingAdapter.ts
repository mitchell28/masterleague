import { db } from './dbAdapter';
import { fixtures, teams } from '../../server/db/schema';
import { eq, inArray, or, and, gt, lt, desc } from 'drizzle-orm';
import { FOOTBALL_DATA_API_KEY } from './env';

/**
 * Interface for API Match response
 */
interface ApiMatch {
	id: number;
	utcDate: string;
	status: string;
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

/**
 * Interface for the fixture scheduling service response
 */
export interface FixtureScheduleResult {
	checked: number;
	updated: number;
	error?: string;
}

/**
 * Interface for tracking fixture changes
 */
interface FixtureChange {
	id: string;
	homeTeam: string;
	awayTeam: string;
	oldDate: string;
	newDate: string;
	formattedOldDate: string;
	formattedNewDate: string;
	oldStatus: string;
	newStatus: string;
	hasDateChange: boolean;
	hasStatusChange: boolean;
}

/**
 * Format a date to be more human readable
 */
function formatDate(date: Date): string {
	return date.toLocaleString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short'
	});
}

/**
 * Fixture scheduling service adapter for Trigger.dev
 *
 * This adapter provides a version of the fixture scheduling service that works with Trigger.dev,
 * using process.env instead of SvelteKit's $env imports.
 *
 * The adapter:
 * 1. First checks the most recent 10 matches for updates
 * 2. Then checks all scheduled/timed matches for updates
 */
export async function checkFixtureScheduleChanges(): Promise<FixtureScheduleResult> {
	try {
		// Get the API key from our environment adapter
		const apiKey = FOOTBALL_DATA_API_KEY;
		if (!apiKey) {
			return {
				checked: 0,
				updated: 0,
				error: 'FOOTBALL_DATA_API_KEY not found in environment variables'
			};
		}

		console.log('Starting fixture schedule check...');

		// Track total counts across both checks
		let totalChecked = 0;
		let totalUpdated = 0;
		const allUpdatedFixtures: FixtureChange[] = [];

		// Step 1: Check recent matches (limit to 10)
		console.log('\n=== Checking Recent Matches ===');
		const recentResult = await checkRecentMatches(apiKey, 10);
		totalChecked += recentResult.checked;
		totalUpdated += recentResult.updated;
		if (recentResult.updatedFixtures.length > 0) {
			allUpdatedFixtures.push(...recentResult.updatedFixtures);
		}

		// Step 2: Check upcoming matches
		console.log('\n=== Checking Upcoming Matches ===');
		const upcomingResult = await checkUpcomingMatches(apiKey);
		totalChecked += upcomingResult.checked;
		totalUpdated += upcomingResult.updated;
		if (upcomingResult.updatedFixtures.length > 0) {
			allUpdatedFixtures.push(...upcomingResult.updatedFixtures);
		}

		// Print overall summary
		console.log(`\n=== Overall Summary ===`);
		console.log(`Total fixtures checked: ${totalChecked}`);
		console.log(`Total fixtures updated: ${totalUpdated}`);

		// Summarize changes if any were made
		if (allUpdatedFixtures.length > 0) {
			logChangeSummary(allUpdatedFixtures);
		}

		// Return combined results
		return {
			checked: totalChecked,
			updated: totalUpdated
		};
	} catch (error) {
		console.error('Error checking fixture schedule changes:', error);
		return {
			checked: 0,
			updated: 0,
			error: error instanceof Error ? error.message : 'Unknown error checking fixture schedules'
		};
	}
}

/**
 * Checks recent matches for updates
 */
async function checkRecentMatches(
	apiKey: string,
	limit: number
): Promise<{ checked: number; updated: number; updatedFixtures: FixtureChange[] }> {
	const now = new Date();

	// Get recent fixtures - simplified query without joins
	const recentFixtures = await db
		.select()
		.from(fixtures)
		.where(lt(fixtures.matchDate, now))
		.orderBy(desc(fixtures.matchDate))
		.limit(limit);

	// If no fixtures to check, return early
	if (recentFixtures.length === 0) {
		console.log('No recent fixtures to check');
		return { checked: 0, updated: 0, updatedFixtures: [] };
	}

	console.log(`Found ${recentFixtures.length} recent fixtures to check`);

	// Load team names for the fixtures
	const teamNames = await getTeamNames(recentFixtures);

	// Process the fixtures to check for updates
	return await processFixturesForUpdates(recentFixtures, teamNames, apiKey);
}

/**
 * Checks upcoming matches for updates
 */
async function checkUpcomingMatches(
	apiKey: string
): Promise<{ checked: number; updated: number; updatedFixtures: FixtureChange[] }> {
	const now = new Date();

	// Get upcoming fixtures - simplified query without joins
	const upcomingFixtures = await db
		.select()
		.from(fixtures)
		.where(
			or(
				inArray(fixtures.status, ['SCHEDULED', 'TIMED', 'POSTPONED', 'SUSPENDED', 'CANCELLED']),
				and(gt(fixtures.matchDate, now), eq(fixtures.status, 'SCHEDULED'))
			)
		);

	// If no fixtures to check, return early
	if (upcomingFixtures.length === 0) {
		console.log('No upcoming fixtures to check');
		return { checked: 0, updated: 0, updatedFixtures: [] };
	}

	console.log(`Found ${upcomingFixtures.length} upcoming fixtures to check`);

	// Load team names for the fixtures
	const teamNames = await getTeamNames(upcomingFixtures);

	// Process the fixtures to check for updates
	return await processFixturesForUpdates(upcomingFixtures, teamNames, apiKey);
}

/**
 * Helper to load team names for a set of fixtures
 */
async function getTeamNames(fixturesList: any[]): Promise<Map<string, string>> {
	// Extract unique team IDs
	const teamIds = new Set<string>();
	fixturesList.forEach((fixture) => {
		if (fixture.homeTeamId) teamIds.add(fixture.homeTeamId);
		if (fixture.awayTeamId) teamIds.add(fixture.awayTeamId);
	});

	// Fetch team data in a single query
	const teamData = await db
		.select()
		.from(teams)
		.where(inArray(teams.id, Array.from(teamIds)));

	// Create a map of team ID to team name for quick lookups
	const teamMap = new Map<string, string>();
	teamData.forEach((team) => {
		teamMap.set(team.id, team.name || 'Unknown Team');
	});

	return teamMap;
}

/**
 * Process a set of fixtures to check for updates from the API
 */
async function processFixturesForUpdates(
	dbFixtures: any[],
	teamNames: Map<string, string>,
	apiKey: string
): Promise<{ checked: number; updated: number; updatedFixtures: FixtureChange[] }> {
	// Extract matchIds from fixtures - filter out any nulls
	const matchIds = dbFixtures.map((fixture) => fixture.matchId).filter(Boolean) as string[];

	if (matchIds.length === 0) {
		return { checked: dbFixtures.length, updated: 0, updatedFixtures: [] };
	}

	// Process fixtures in batches to respect API limits
	const batchSize = 20;
	let updatedCount = 0;
	const updatedFixtures: FixtureChange[] = [];

	for (let i = 0; i < matchIds.length; i += batchSize) {
		const batchIds = matchIds.slice(i, i + batchSize);
		const matchIdsParam = batchIds.join(',');

		console.log(
			`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(matchIds.length / batchSize)}`
		);

		// Fetch latest fixture data from the API
		const MATCHES_API_URL = `https://api.football-data.org/v4/matches?ids=${matchIdsParam}`;
		const response = await fetch(MATCHES_API_URL, {
			headers: {
				'X-Auth-Token': apiKey
			}
		});

		if (!response.ok) {
			throw new Error(`API request failed with status ${response.status}`);
		}

		const data = await response.json();
		const apiMatches = (data.matches || []) as ApiMatch[];

		// Check each API match against our database
		for (const apiMatch of apiMatches) {
			// Find the corresponding fixture in our database
			const dbFixture = dbFixtures.find((f) => f.matchId === apiMatch.id.toString());

			if (!dbFixture) continue;

			// Compare matchDate and status
			const apiMatchDate = new Date(apiMatch.utcDate);
			const dbMatchDate = new Date(dbFixture.matchDate);

			// Check for date or status changes (5 minutes threshold for date changes)
			const hasDateChange =
				Math.abs(apiMatchDate.getTime() - dbMatchDate.getTime()) > 5 * 60 * 1000;
			const hasStatusChange = dbFixture.status !== apiMatch.status;

			// If either has changed, update the fixture
			if (hasDateChange || hasStatusChange) {
				await db
					.update(fixtures)
					.set({
						matchDate: apiMatchDate,
						status: apiMatch.status,
						lastUpdated: new Date()
					})
					.where(eq(fixtures.id, dbFixture.id));

				updatedCount++;

				// Get team names from our map
				const homeTeamName = teamNames.get(dbFixture.homeTeamId) || 'Unknown Team';
				const awayTeamName = teamNames.get(dbFixture.awayTeamId) || 'Unknown Team';

				// Format dates for readable logging
				const formattedOldDate = formatDate(dbMatchDate);
				const formattedNewDate = formatDate(apiMatchDate);

				// Track detailed changes for reporting with team names
				const change: FixtureChange = {
					id: dbFixture.id,
					homeTeam: homeTeamName,
					awayTeam: awayTeamName,
					oldDate: dbMatchDate.toISOString(),
					newDate: apiMatchDate.toISOString(),
					formattedOldDate,
					formattedNewDate,
					oldStatus: dbFixture.status,
					newStatus: apiMatch.status,
					hasDateChange,
					hasStatusChange
				};

				updatedFixtures.push(change);

				// Log individual update
				logFixtureUpdate(change);
			}
		}

		// Small delay between batches to respect API rate limits
		if (i + batchSize < matchIds.length) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	// Summarize batch results
	console.log(`Checked ${dbFixtures.length} fixtures, updated ${updatedCount}`);

	return {
		checked: dbFixtures.length,
		updated: updatedCount,
		updatedFixtures
	};
}

/**
 * Log details about a single fixture update
 */
function logFixtureUpdate(change: FixtureChange): void {
	const matchupText = `${change.homeTeam} vs ${change.awayTeam}`;

	if (change.hasDateChange && change.hasStatusChange) {
		console.log(
			`Updated: ${matchupText}\n` +
				`  Date: ${change.formattedOldDate} → ${change.formattedNewDate}\n` +
				`  Status: ${change.oldStatus} → ${change.newStatus}`
		);
	} else if (change.hasDateChange) {
		console.log(
			`Updated: ${matchupText}\n` +
				`  Date change: ${change.formattedOldDate} → ${change.formattedNewDate}`
		);
	} else {
		console.log(
			`Updated: ${matchupText}\n` + `  Status change: ${change.oldStatus} → ${change.newStatus}`
		);
	}
}

/**
 * Log a summary of all fixture changes
 */
function logChangeSummary(updatedFixtures: FixtureChange[]): void {
	console.log('\n=== Summary of Changes ===');

	// Group status changes for better reporting
	const statusChanges: Record<string, number> = {};
	for (const fixture of updatedFixtures) {
		if (fixture.hasStatusChange) {
			const changeKey = `${fixture.oldStatus} → ${fixture.newStatus}`;
			statusChanges[changeKey] = (statusChanges[changeKey] || 0) + 1;
		}
	}

	// Report status changes
	if (Object.keys(statusChanges).length > 0) {
		console.log('\nStatus changes:');
		for (const [change, count] of Object.entries(statusChanges)) {
			console.log(`  ${change}: ${count} fixture(s)`);
		}
	}

	// Count and list date changes
	const fixturesWithDateChanges = updatedFixtures.filter((f) => f.hasDateChange);
	if (fixturesWithDateChanges.length > 0) {
		console.log(`\nDate changes: ${fixturesWithDateChanges.length} fixture(s)`);
		console.log('\nList of fixtures with date changes:');
		fixturesWithDateChanges.forEach((fixture) => {
			console.log(
				`  ${fixture.homeTeam} vs ${fixture.awayTeam}: ${fixture.formattedOldDate} → ${fixture.formattedNewDate}`
			);
		});
	}
}
