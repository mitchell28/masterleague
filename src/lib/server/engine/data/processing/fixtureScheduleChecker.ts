import { db } from '../../../db/index.js';
import { fixtures, teams } from '../../../db/schema.js';
import { eq, inArray, or, and, gt, lt, desc } from 'drizzle-orm';

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
	changes: FixtureChange[];
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
 * Rate-limited delay between API calls
 */
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check for fixture schedule changes with intelligent processing integration
 * Works with the new engine architecture and rate limiting
 */
export async function checkFixtureScheduleChanges(options: {
	apiKey: string;
	recentLimit?: number;
	batchSize?: number;
	delayMs?: number;
}): Promise<FixtureScheduleResult> {
	const { apiKey, recentLimit = 15, batchSize = 50, delayMs = 6500 } = options;

	const startTime = Date.now();
	const maxDuration = 150000; // 2.5 minutes max (leave buffer for trigger timeout)

	try {
		console.log('🔍 Starting fixture schedule check...');

		// Track total counts across both checks
		let totalChecked = 0;
		let totalUpdated = 0;
		const allChanges: FixtureChange[] = [];

		// Step 1: Check recent matches (limit to prevent overwhelming)
		console.log('\n=== Checking Recent Matches ===');

		// Check if we have time for recent matches
		if (Date.now() - startTime < maxDuration * 0.6) {
			const recentResult = await checkRecentMatches(apiKey, recentLimit, batchSize, delayMs);
			totalChecked += recentResult.checked;
			totalUpdated += recentResult.updated;
			if (recentResult.changes.length > 0) {
				allChanges.push(...recentResult.changes);
			}
		} else {
			console.log('⏰ Skipping recent matches check - time limit approaching');
		}

		// Step 2: Check upcoming matches (only if we have time)
		if (Date.now() - startTime < maxDuration * 0.8) {
			console.log('\n=== Checking Upcoming Matches ===');
			const upcomingResult = await checkUpcomingMatches(apiKey, batchSize, delayMs);
			totalChecked += upcomingResult.checked;
			totalUpdated += upcomingResult.updated;
			if (upcomingResult.changes.length > 0) {
				allChanges.push(...upcomingResult.changes);
			}
		} else {
			console.log('⏰ Skipping upcoming matches check - time limit reached');
		}

		// Print overall summary
		console.log(`\n=== Overall Summary ===`);
		console.log(`📊 Total fixtures checked: ${totalChecked}`);
		console.log(`🔄 Total fixtures updated: ${totalUpdated}`);
		console.log(`⏱️ Processing time: ${Math.round((Date.now() - startTime) / 1000)}s`);

		// Summarize changes if any were made
		if (allChanges.length > 0) {
			logChangeSummary(allChanges);
		}

		// Return combined results
		return {
			checked: totalChecked,
			updated: totalUpdated,
			changes: allChanges
		};
	} catch (error) {
		console.error('❌ Error checking fixture schedule changes:', error);
		return {
			checked: 0,
			updated: 0,
			changes: [],
			error: error instanceof Error ? error.message : 'Unknown error checking fixture schedules'
		};
	}
}

/**
 * Checks recent matches for updates
 */
async function checkRecentMatches(
	apiKey: string,
	limit: number,
	batchSize: number,
	delayMs: number
): Promise<{ checked: number; updated: number; changes: FixtureChange[] }> {
	const now = new Date();

	// Get recent fixtures
	const recentFixtures = await db
		.select()
		.from(fixtures)
		.where(lt(fixtures.matchDate, now))
		.orderBy(desc(fixtures.matchDate))
		.limit(limit);

	if (recentFixtures.length === 0) {
		console.log('📭 No recent fixtures to check');
		return { checked: 0, updated: 0, changes: [] };
	}

	console.log(`📋 Found ${recentFixtures.length} recent fixtures to check`);

	// Load team names for the fixtures
	const teamNames = await getTeamNames(recentFixtures);

	// Process the fixtures to check for updates
	return await processFixturesForUpdates(recentFixtures, teamNames, apiKey, batchSize, delayMs);
}

/**
 * Checks upcoming matches for updates
 */
async function checkUpcomingMatches(
	apiKey: string,
	batchSize: number,
	delayMs: number
): Promise<{ checked: number; updated: number; changes: FixtureChange[] }> {
	const now = new Date();

	// Get upcoming fixtures - using the correct statuses from schema
	const upcomingFixtures = await db
		.select()
		.from(fixtures)
		.where(
			or(
				inArray(fixtures.status, ['SCHEDULED', 'TIMED', 'POSTPONED', 'SUSPENDED', 'CANCELLED']),
				and(gt(fixtures.matchDate, now), eq(fixtures.status, 'SCHEDULED'))
			)
		);

	if (upcomingFixtures.length === 0) {
		console.log('📭 No upcoming fixtures to check');
		return { checked: 0, updated: 0, changes: [] };
	}

	console.log(`📋 Found ${upcomingFixtures.length} upcoming fixtures to check`);

	// Load team names for the fixtures
	const teamNames = await getTeamNames(upcomingFixtures);

	// Process the fixtures to check for updates
	return await processFixturesForUpdates(upcomingFixtures, teamNames, apiKey, batchSize, delayMs);
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

	if (teamIds.size === 0) {
		return new Map();
	}

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
 * Process a set of fixtures to check for updates from the API with rate limiting
 */
async function processFixturesForUpdates(
	dbFixtures: any[],
	teamNames: Map<string, string>,
	apiKey: string,
	batchSize: number,
	delayMs: number
): Promise<{ checked: number; updated: number; changes: FixtureChange[] }> {
	// Extract matchIds from fixtures - filter out any nulls
	const matchIds = dbFixtures.map((fixture) => fixture.matchId).filter(Boolean) as string[];

	if (matchIds.length === 0) {
		return { checked: dbFixtures.length, updated: 0, changes: [] };
	}

	// Process fixtures in smaller batches to respect API limits
	let updatedCount = 0;
	const changes: FixtureChange[] = [];

	// Add initial delay to prevent immediate rate limiting
	if (matchIds.length > 0) {
		console.log(`⏳ Initial delay of ${delayMs}ms before starting batch processing...`);
		await delay(delayMs);
	}

	for (let i = 0; i < matchIds.length; i += batchSize) {
		const batchIds = matchIds.slice(i, i + batchSize);
		const matchIdsParam = batchIds.join(',');

		console.log(
			`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(matchIds.length / batchSize)} (${batchIds.length} fixtures) - delay: ${delayMs}ms`
		);

		try {
			// Fetch latest fixture data from the API
			const MATCHES_API_URL = `https://api.football-data.org/v4/matches?ids=${matchIdsParam}`;
			const response = await fetch(MATCHES_API_URL, {
				headers: {
					'X-Auth-Token': apiKey
				}
			});

			if (!response.ok) {
				if (response.status === 429) {
					console.warn('⚠️ Rate limited, waiting much longer...');
					await delay(delayMs * 4); // Quadruple delay on rate limit
					// Don't continue - retry this exact batch
					i -= batchSize; // Reset to retry this batch
					continue;
				}
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

					changes.push(change);

					// Log individual update
					logFixtureUpdate(change);
				}
			}

			// Rate limiting delay between batches
			if (i + batchSize < matchIds.length) {
				console.log(`⏳ Waiting ${delayMs}ms before next batch...`);
				await delay(delayMs);
			}
		} catch (error) {
			console.error(`❌ Error processing batch starting at index ${i}:`, error);
			// Continue with next batch on error
			await delay(delayMs);
		}
	}

	// Summarize batch results
	console.log(`✅ Checked ${dbFixtures.length} fixtures, updated ${updatedCount}`);

	return {
		checked: dbFixtures.length,
		updated: updatedCount,
		changes
	};
}

/**
 * Log details about a single fixture update
 */
function logFixtureUpdate(change: FixtureChange): void {
	const matchupText = `${change.homeTeam} vs ${change.awayTeam}`;

	if (change.hasDateChange && change.hasStatusChange) {
		console.log(
			`🔄 Updated: ${matchupText}\n` +
				`  📅 Date: ${change.formattedOldDate} → ${change.formattedNewDate}\n` +
				`  🏷️ Status: ${change.oldStatus} → ${change.newStatus}`
		);
	} else if (change.hasDateChange) {
		console.log(
			`📅 Updated: ${matchupText}\n` +
				`  Date change: ${change.formattedOldDate} → ${change.formattedNewDate}`
		);
	} else {
		console.log(
			`🏷️ Updated: ${matchupText}\n` + `  Status change: ${change.oldStatus} → ${change.newStatus}`
		);
	}
}

/**
 * Log a summary of all fixture changes
 */
function logChangeSummary(changes: FixtureChange[]): void {
	console.log('\n📊 === Summary of Changes ===');

	// Group status changes for better reporting
	const statusChanges: Record<string, number> = {};
	for (const change of changes) {
		if (change.hasStatusChange) {
			const changeKey = `${change.oldStatus} → ${change.newStatus}`;
			statusChanges[changeKey] = (statusChanges[changeKey] || 0) + 1;
		}
	}

	// Report status changes
	if (Object.keys(statusChanges).length > 0) {
		console.log('\n🏷️ Status changes:');
		for (const [changeType, count] of Object.entries(statusChanges)) {
			console.log(`  ${changeType}: ${count} fixture(s)`);
		}
	}

	// Count and list date changes
	const fixturesWithDateChanges = changes.filter((f) => f.hasDateChange);
	if (fixturesWithDateChanges.length > 0) {
		console.log(`\n📅 Date changes: ${fixturesWithDateChanges.length} fixture(s)`);
		fixturesWithDateChanges.forEach((change) => {
			console.log(
				`  ${change.homeTeam} vs ${change.awayTeam}: ${change.formattedOldDate} → ${change.formattedNewDate}`
			);
		});
	}
}
