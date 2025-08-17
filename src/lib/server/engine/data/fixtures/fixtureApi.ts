import { db } from '../../../db';
import { fixtures } from '../../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getFootballApiKey } from '../../../utils/env';
import { randomUUID } from 'crypto';
import { mapApiStatusToDbStatus } from './fixtureUtils';
import { deleteFixturesByWeek, setRandomMultipliersForWeek } from './fixtureRepository';

// Get API key - works in both SvelteKit and Trigger.dev contexts
const FOOTBALL_DATA_API_KEY = getFootballApiKey();

if (!FOOTBALL_DATA_API_KEY) {
	console.warn('FOOTBALL_DATA_API_KEY is not set. API calls will fail.');
}

// Global API cache and rate limiter
// This will persist across function calls but will reset when server restarts
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache TTL
const apiCache: Record<string, { data: any; timestamp: number }> = {};

// Application-wide rate limit settings and state
const API_RATE_LIMIT = {
	callsPerMinute: 10,
	callTimestamps: [] as number[], // Track API call timestamps
	isRateLimited: false,
	lastRateLimitCheck: 0,

	// Check if we're currently rate limited without blocking
	checkRateLimit(): boolean {
		const now = Date.now();

		// Only check every second at most to avoid excessive calculations
		if (now - this.lastRateLimitCheck < 1000) {
			return this.isRateLimited;
		}

		// Remove timestamps older than 1 minute
		const oneMinuteAgo = now - 60000;
		while (this.callTimestamps.length > 0 && this.callTimestamps[0] < oneMinuteAgo) {
			this.callTimestamps.shift();
		}

		// Update rate limit status
		this.isRateLimited = this.callTimestamps.length >= this.callsPerMinute;
		this.lastRateLimitCheck = now;

		return this.isRateLimited;
	},

	// Record an API call
	recordApiCall(): void {
		const now = Date.now();
		this.callTimestamps.push(now);
		this.checkRateLimit();
	},

	// Get estimated wait time until next available slot
	getEstimatedWaitTime(): number {
		if (!this.isRateLimited || this.callTimestamps.length === 0) {
			return 0;
		}

		const now = Date.now();
		const oldestCall = this.callTimestamps[0];
		return Math.max(oldestCall + 60000 - now, 0);
	}
};

// Interface for the queue system
interface ApiRequest {
	id: string;
	url: string;
	headers: Record<string, string>;
	resolve: (data: any) => void;
	reject: (error: Error) => void;
	timestamp: number;
	retries: number;
	priority: number;
}

// Queue for API requests
class ApiRequestQueue {
	private queue: ApiRequest[] = [];
	private isProcessing = false;
	private static instance: ApiRequestQueue;

	// Singleton pattern
	static getInstance(): ApiRequestQueue {
		if (!ApiRequestQueue.instance) {
			ApiRequestQueue.instance = new ApiRequestQueue();
		}
		return ApiRequestQueue.instance;
	}

	// Add a request to the queue
	enqueue(request: Omit<ApiRequest, 'id' | 'timestamp' | 'retries' | 'priority'>): Promise<any> {
		return new Promise((resolve, reject) => {
			const apiRequest: ApiRequest = {
				...request,
				id: randomUUID(),
				timestamp: Date.now(),
				retries: 0,
				priority: 1, // Default priority
				resolve,
				reject
			};

			this.queue.push(apiRequest);

			// Sort by priority (higher first) then by timestamp (older first)
			this.queue.sort((a, b) => {
				if (a.priority !== b.priority) {
					return b.priority - a.priority;
				}
				return a.timestamp - b.timestamp;
			});

			// Start processing if not already
			if (!this.isProcessing) {
				this.processQueue();
			}
		});
	}

	// Process the queue
	private async processQueue(): Promise<void> {
		if (this.queue.length === 0) {
			this.isProcessing = false;
			return;
		}

		this.isProcessing = true;

		// Check if we're rate limited
		if (API_RATE_LIMIT.checkRateLimit()) {
			const waitTime = API_RATE_LIMIT.getEstimatedWaitTime();
			// console.log(`App-wide rate limit reached. Queue will resume in ${waitTime}ms`);

			// Wait for the rate limit to expire, but check every second
			await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 1000)));

			// Try processing again
			this.processQueue();
			return;
		}

		// Process the next request
		const request = this.queue.shift();
		if (!request) {
			this.processQueue();
			return;
		}

		try {
			// Record this API call
			API_RATE_LIMIT.recordApiCall();

			// Make the API request
			const response = await fetch(request.url, {
				headers: request.headers
			});

			if (response.status === 429) {
				// Rate limit hit, requeue with increased priority
				request.retries += 1;
				request.priority += 1;
				this.queue.unshift(request);

				// Wait a bit before trying again
				await new Promise((resolve) => setTimeout(resolve, 2000));
			} else if (!response.ok) {
				// Other error
				if (request.retries < 3) {
					// Retry up to 3 times
					request.retries += 1;
					this.queue.push(request);
					// console.error(
					// 	`API request failed with status ${response.status}, retry ${request.retries}/3`
					// );
				} else {
					// Give up after 3 retries
					request.reject(
						new Error(`API request failed with status ${response.status} after 3 retries`)
					);
				}
			} else {
				// Success
				const data = await response.json();
				request.resolve(data);
			}
		} catch (error) {
			// Network error, retry once
			if (request.retries < 1) {
				request.retries += 1;
				this.queue.push(request);
				// console.error('Network error making API request, will retry once');
			} else {
				request.reject(error instanceof Error ? error : new Error(String(error)));
			}
		}

		// Continue processing after a small delay
		setTimeout(() => this.processQueue(), 100);
	}
}

// Get the API queue instance
const apiQueue = ApiRequestQueue.getInstance();

// Helper function to make API calls through the queue
async function queuedApiCall(url: string, apiKey: string): Promise<any> {
	// First check cache
	const cacheKey = url;
	const now = Date.now();

	if (apiCache[cacheKey] && now - apiCache[cacheKey].timestamp < CACHE_TTL) {
		// console.log(`Using cached data for: ${url}`);
		return apiCache[cacheKey].data;
	}

	// Queue the API request
	const data = await apiQueue.enqueue({
		url,
		headers: {
			'X-Auth-Token': apiKey
		},
		resolve: (data) => data,
		reject: (error) => {
			throw error;
		}
	});

	// Cache the result
	apiCache[cacheKey] = {
		data,
		timestamp: now
	};

	return data;
}

export interface ApiMatchTeam {
	id: number;
	name: string;
	shortName: string;
	tla: string;
	crest: string;
}

export interface ApiMatch {
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

/**
 * Fetch fixtures from Football-Data.org API and seed them into the database
 */
export async function seedFixturesWithSeasonYear(season: string = '2025-26'): Promise<void> {
	// Get the API key
	const apiKey = FOOTBALL_DATA_API_KEY;
	if (!apiKey) {
		throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
	}

	// First, get teams directly from the API
	const TEAMS_API_URL = `https://api.football-data.org/v4/competitions/PL/teams?season=${season}`;
	const teamsResponse = await queuedApiCall(TEAMS_API_URL, apiKey);

	const teamsData = teamsResponse;
	const apiTeams = teamsData.teams || [];

	// Create map of API team IDs to our team IDs
	const teamMap: Record<number, string> = {};

	// Get existing teams from our database
	const existingTeams = await db.query.teams.findMany();
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
			// console.warn(`Team not found in DB: ${apiTeam.name} (${tla})`);
		}
	}

	// Now fetch the matches from the API
	const MATCHES_API_URL = `https://api.football-data.org/v4/competitions/PL/matches?season=${season}`;
	const matchesResponse = await queuedApiCall(MATCHES_API_URL, apiKey);

	const data = matchesResponse;
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
					// console.warn(`Skipping match ${match.id}: Could not find team mapping`);
					return null;
				}

				// Get scores if available
				const homeScore = match.score.fullTime.home !== null ? match.score.fullTime.home : null;
				const awayScore = match.score.fullTime.away !== null ? match.score.fullTime.away : null;

				// Map API status to our status
				const status = mapApiStatusToDbStatus(match.status);

				return {
					id: randomUUID(),
					matchId: match.id.toString(), // Use the API match ID as our matchId
					weekId: parseInt(weekId),
					season: season, // Add the season parameter
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

/**
 * Fetch current status of fixtures from the football API and update the database
 */
export async function updateFixtureStatuses(
	fixtureIds: string[] = []
): Promise<{ updated: number; live: number; rateLimited: boolean }> {
	// Get the API key
	const apiKey = FOOTBALL_DATA_API_KEY;
	if (!apiKey) {
		throw new Error('FOOTBALL_DATA_API_KEY not found in environment variables');
	}

	// Determine which fixtures to check
	let fixturesToCheck: (typeof fixtures.$inferSelect)[] = [];

	if (fixtureIds.length > 0) {
		// If specific fixture IDs are provided, use those
		fixturesToCheck = await db.select().from(fixtures).where(inArray(fixtures.id, fixtureIds));
	} else {
		// Check all fixtures that are not FINISHED
		fixturesToCheck = await db
			.select()
			.from(fixtures)
			.where(
				inArray(fixtures.status, [
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
		return { updated: 0, live: 0, rateLimited: false };
	}

	// Get fixtures with matchId to query the Football Data API
	const fixturesWithMatchId = fixturesToCheck.filter((f) => f.matchId != null);

	if (fixturesWithMatchId.length === 0) {
		return { updated: 0, live: 0, rateLimited: false };
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

	// Check if we're currently rate limited
	const isRateLimited = API_RATE_LIMIT.checkRateLimit();

	// If rate limited, return early but don't block the user
	if (isRateLimited) {
		return { updated: 0, live: 0, rateLimited: true };
	}

	// Fetch current status for these matches
	let updatedCount = 0;
	let liveCount = 0;

	// Process fixtures in batches to respect API rate limits
	const batchSize = 5; // Process 5 matches per API call

	for (let i = 0; i < matchIds.length; i += batchSize) {
		// Check again if we became rate limited during processing
		if (API_RATE_LIMIT.checkRateLimit()) {
			return { updated: updatedCount, live: liveCount, rateLimited: true };
		}

		const batchIds = matchIds.slice(i, i + batchSize);
		const matchIdsParam = batchIds.join(',');

		try {
			// Use our queued API call system
			const MATCHES_API_URL = `https://api.football-data.org/v4/matches?ids=${matchIdsParam}`;
			const data = await queuedApiCall(MATCHES_API_URL, apiKey);
			const apiMatches = data.matches || [];

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
							const { processPredictionsForFixture } = await import('../predictions');
							await processPredictionsForFixture(fixture.id, homeScore, awayScore);
						} catch (error) {
							console.error(`Error processing predictions for fixture ${fixture.id}:`, error);
						}
					}
				}
			}
		} catch (error) {
			console.error(`Error updating batch ${i}:`, error);
			// Continue with next batch even if this one failed
		}
	}

	return { updated: updatedCount, live: liveCount, rateLimited: false };
}
