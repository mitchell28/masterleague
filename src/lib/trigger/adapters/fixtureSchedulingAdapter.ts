import { db } from './dbAdapter';
import { fixtures } from '../../server/db/schema';
import { eq, inArray, or, and, gt } from 'drizzle-orm';
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
 * Fixture scheduling service adapter for Trigger.dev
 *
 * This adapter provides a version of the fixture scheduling service that works with Trigger.dev,
 * using process.env instead of SvelteKit's $env imports.
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

		// Get all fixtures that are scheduled or upcoming (not played yet)
		// We want to check all fixtures that haven't been played yet, not just those with 'SCHEDULED' status
		const now = new Date();
		const dbFixtures = await db
			.select()
			.from(fixtures)
			.where(
				or(
					// Check fixtures with these statuses
					inArray(fixtures.status, [
						'SCHEDULED', // Basic scheduled status
						'TIMED', // Time confirmed
						'POSTPONED', // Postponed but will be rescheduled
						'SUSPENDED', // Suspended but will continue
						'CANCELLED' // Might be rescheduled
					]),
					// Or check any fixture with a future date regardless of status
					and(
						gt(fixtures.matchDate, now), // Match date is in the future
						eq(fixtures.status, 'SCHEDULED') // Base status
					)
				)
			);

		// If no fixtures to check, return early
		if (dbFixtures.length === 0) {
			console.log('No upcoming fixtures to check for schedule changes');
			return { checked: 0, updated: 0 };
		}

		console.log(`Found ${dbFixtures.length} upcoming fixtures to check for schedule changes`);

		// Extract matchIds from our fixtures - filter out any nulls
		const matchIds = dbFixtures.map((fixture) => fixture.matchId).filter(Boolean) as string[];

		// Process fixtures in batches to respect API limits
		const batchSize = 20; // Increased batch size
		let updatedCount = 0;
		const updatedFixtures: { id: string; oldDate: string; newDate: string }[] = [];

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

				// Compare matchDate - we're interested in scheduling changes
				const apiMatchDate = new Date(apiMatch.utcDate);
				const dbMatchDate = new Date(dbFixture.matchDate);

				// Check if the status or match date has changed
				const needsUpdate =
					// Check if the match date is significantly different (more than 5 minutes)
					Math.abs(apiMatchDate.getTime() - dbMatchDate.getTime()) > 5 * 60 * 1000 ||
					dbFixture.status !== apiMatch.status;

				if (needsUpdate) {
					await db
						.update(fixtures)
						.set({
							matchDate: apiMatchDate,
							status: apiMatch.status,
							lastUpdated: new Date()
						})
						.where(eq(fixtures.id, dbFixture.id));

					updatedCount++;

					// Track date changes specifically
					if (Math.abs(apiMatchDate.getTime() - dbMatchDate.getTime()) > 5 * 60 * 1000) {
						updatedFixtures.push({
							id: dbFixture.id,
							oldDate: dbMatchDate.toISOString(),
							newDate: apiMatchDate.toISOString()
						});
					}

					console.log(
						`Updated fixture ${dbFixture.id}: Date change: ${dbMatchDate.toISOString()} -> ${apiMatchDate.toISOString()}, Status: ${dbFixture.status} -> ${apiMatch.status}`
					);
				}
			}

			// Small delay between batches to respect API rate limits
			if (i + batchSize < matchIds.length) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		// Log summary of fixtures with updated dates
		if (updatedFixtures.length > 0) {
			console.log('Fixtures with updated dates:');
			updatedFixtures.forEach((fixture) => {
				console.log(
					`ID: ${fixture.id} - Date changed from ${fixture.oldDate} to ${fixture.newDate}`
				);
			});
		}

		return {
			checked: dbFixtures.length,
			updated: updatedCount
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
