import { db, member, session } from '$lib/server/db';
import { teams, predictions, fixtures, type Fixture } from '$lib/server/db/schema';
import { inArray, eq, and } from 'drizzle-orm';
import { getFixturesByWeek } from '../fixtures';
import { randomUUID } from 'crypto';

// More aggressive caching for fixtures
const fixturesCache = new Map<
	string,
	{
		fixtures: any[];
		predictions?: Record<string, any>;
		teams?: Record<string, any>;
		timestamp: number;
	}
>();
export const FIXTURES_CACHE_TTL = 20 * 1000; // 20 seconds cache

// Cache for teams data
const teamsCache = new Map<string, { teams: Record<string, any>; timestamp: number }>();
export const TEAMS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Function to check if a fixture can be predicted (more than 30 minutes before kickoff)
export function canPredictFixture(fixture: any): boolean {
	// Don't allow prediction if fixture is already in progress or completed
	const inProgressOrCompleted = [
		'IN_PLAY',
		'PAUSED',
		'FINISHED',
		'SUSPENDED',
		'POSTPONED',
		'CANCELLED',
		'AWARDED'
	].includes(fixture.status);
	if (inProgressOrCompleted) return false;

	// Check if it's more than 30 minutes before kickoff
	const matchDate = new Date(fixture.matchDate);
	const now = new Date();
	const cutoffTime = new Date(matchDate.getTime() - 30 * 60 * 1000); // 30 minutes before

	return now < cutoffTime;
}

// Function to check if a fixture is live
export function isFixtureLive(status: string): boolean {
	return ['IN_PLAY', 'PAUSED'].includes(status);
}

// Define interfaces for better type safety
export interface UserPrediction {
	fixtureId: string;
	predictedHomeScore: number;
	predictedAwayScore: number;
	points?: number | null;
	// Include other properties that might exist on the prediction object
	id?: string;
	userId?: string;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface PredictionMapEntry extends UserPrediction {
	home: number;
	away: number;
}

// Function to prepare fixtures with prediction info
export function prepareFixturesWithPredictionInfo(fixtures: any[], isPastWeek: boolean) {
	return fixtures.map((fixture) => {
		const matchDate = new Date(fixture.matchDate);
		const isWeekend = matchDate.getDay() === 0 || matchDate.getDay() === 6;
		const canPredict = !isPastWeek && canPredictFixture(fixture);

		return {
			...fixture,
			canPredict,
			isPastWeek,
			isWeekend,
			isLive: isFixtureLive(fixture.status),
			predictionClosesAt: new Date(matchDate.getTime() - 60 * 60 * 1000)
		};
	});
}

// Function to convert predictions to a map
export function convertPredictionsToMap(
	predictions: UserPrediction[]
): Record<string, PredictionMapEntry> {
	return predictions.reduce<Record<string, PredictionMapEntry>>(
		(acc: Record<string, PredictionMapEntry>, prediction: UserPrediction) => {
			if (
				prediction.predictedHomeScore !== null &&
				prediction.predictedAwayScore !== null &&
				prediction.predictedHomeScore !== undefined &&
				prediction.predictedAwayScore !== undefined
			) {
				acc[prediction.fixtureId] = {
					...prediction,
					home: prediction.predictedHomeScore,
					away: prediction.predictedAwayScore
				};
			}
			return acc;
		},
		{}
	);
}

// Function to get cached fixtures or fetch new ones
export async function getFixturesWithPredictions(
	userId: string,
	week: number,
	currentWeek: number,
	organizationId?: string
) {
	const cacheKey = `week-${week}-${userId}`;
	const now = Date.now();
	const cachedData = fixturesCache.get(cacheKey);

	// Check if we have a valid cache entry
	if (cachedData && now - cachedData.timestamp < FIXTURES_CACHE_TTL) {
		const fixturesWithPrediction = cachedData.fixtures;

		// Only update live fixtures more frequently
		const hasLiveFixtures = fixturesWithPrediction.some((f: any) => f.isLive);
		if (!hasLiveFixtures) {
			// If no live fixtures, we can use cached data
			return {
				fixturesWithPrediction,
				predictionsMap: cachedData.predictions || {},
				teamsMap: cachedData.teams || {},
				fromCache: true,
				lastUpdated: new Date(cachedData.timestamp).toISOString()
			};
		}
	}

	// Get fixtures for the selected week
	const fixtures = await getFixturesByWeek(week);

	// Skip processing if no fixtures
	if (!fixtures.length) {
		return {
			fixturesWithPrediction: [],
			predictionsMap: {},
			teamsMap: {},
			fromCache: false,
			lastUpdated: new Date().toISOString()
		};
	}

	// Sort fixtures by date server-side
	const sortedFixtures = [...fixtures].sort(
		(a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
	);

	// Get user's predictions for this week
	const userPredictions = await getUserPredictionsByWeek(userId, week, organizationId);

	// Get teams data
	const teamsMap = await getTeamsForFixtures(sortedFixtures);

	// Prepare fixtures with prediction info
	const isPastWeek = week < currentWeek;
	const fixturesWithPrediction = prepareFixturesWithPredictionInfo(sortedFixtures, isPastWeek);

	// Convert predictions to a map
	const predictionsMap = convertPredictionsToMap(userPredictions);

	// Cache the processed data
	fixturesCache.set(cacheKey, {
		fixtures: fixturesWithPrediction,
		predictions: predictionsMap,
		teams: teamsMap,
		timestamp: now
	});

	return {
		fixturesWithPrediction,
		predictionsMap,
		teamsMap,
		fromCache: false,
		lastUpdated: new Date().toISOString()
	};
}

// Function to get teams data for fixtures
export async function getTeamsForFixtures(fixtures: any[]) {
	const now = Date.now();

	// Extract team IDs for the fixtures
	const teamIds = [...new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]))];
	const teamCacheKey = teamIds.sort().join('-');

	// Try to get teams from cache first
	const cachedTeams = teamsCache.get(teamCacheKey);
	if (cachedTeams && now - cachedTeams.timestamp < TEAMS_CACHE_TTL) {
		return cachedTeams.teams;
	}

	// Fetch teams only if needed
	const allTeams = await db.select().from(teams).where(inArray(teams.id, teamIds));
	const teamsMap = allTeams.reduce(
		(acc, team) => {
			acc[team.id] = team;
			return acc;
		},
		{} as Record<string, typeof teams.$inferSelect>
	);

	// Cache teams data
	teamsCache.set(teamCacheKey, {
		teams: teamsMap,
		timestamp: now
	});

	return teamsMap;
}

// Function to clear fixture cache for a week
export function clearFixtureCache(week: number, userId?: string) {
	if (userId) {
		const cacheKey = `week-${week}-${userId}`;
		fixturesCache.delete(cacheKey);
	} else {
		// Invalidate all fixture caches for this week
		for (const key of [...fixturesCache.keys()]) {
			if (key.startsWith(`week-${week}`)) {
				fixturesCache.delete(key);
			}
		}
	}
}

/**
 * Submit user predictions for fixtures
 * @param userId The user ID
 * @param predictionsData Array of prediction data containing fixtureId, homeScore, and awayScore
 * @returns Array of created or updated predictions
 */
export async function submitPrediction(
	userId: string,
	predictionsData: Array<{ fixtureId: string; homeScore: number; awayScore: number }>,
	organizationId?: string
): Promise<Array<{ id: string; fixtureId: string }>> {
	// Get the user's active organization if not provided
	let userOrganizationId = organizationId;

	if (!userOrganizationId) {
		const activeOrgId = await getUserActiveOrganization(userId);
		userOrganizationId = activeOrgId || undefined;
	}

	if (!userOrganizationId) {
		throw new Error('User must be a member of an organization to make predictions');
	}
	// Get all fixture IDs from predictions
	const fixtureIds = predictionsData.map((p) => p.fixtureId);

	// Fetch fixtures to validate they exist and can be predicted
	const fixturesData = await db
		.select({
			id: fixtures.id,
			matchDate: fixtures.matchDate,
			status: fixtures.status
		})
		.from(fixtures)
		.where(inArray(fixtures.id, fixtureIds));

	// Create lookup map for quick access
	const fixturesMap = new Map(fixturesData.map((f) => [f.id, f]));

	// Get existing predictions to know which to update vs insert
	const existingPredictions = await db
		.select()
		.from(predictions)
		.where(
			and(
				eq(predictions.userId, userId),
				inArray(predictions.fixtureId, fixtureIds),
				eq(predictions.organizationId, userOrganizationId)
			)
		);

	const existingPredictionsMap = new Map(existingPredictions.map((p) => [p.fixtureId, p]));

	const results: Array<{ id: string; fixtureId: string }> = [];
	const now = new Date();

	// Process each prediction
	for (const prediction of predictionsData) {
		const fixture = fixturesMap.get(prediction.fixtureId);

		// Validate fixture exists
		if (!fixture) {
			throw new Error(`Fixture ${prediction.fixtureId} not found`);
		}

		// Validate the fixture can be predicted (not started or completed)
		if (!canPredictFixture(fixture)) {
			throw new Error(`The cutoff time has passed for fixture ${prediction.fixtureId}`);
		}

		const existingPrediction = existingPredictionsMap.get(prediction.fixtureId);

		if (existingPrediction) {
			// Update existing prediction
			await db
				.update(predictions)
				.set({
					predictedHomeScore: prediction.homeScore,
					predictedAwayScore: prediction.awayScore
				})
				.where(eq(predictions.id, existingPrediction.id));

			results.push({
				id: existingPrediction.id,
				fixtureId: prediction.fixtureId
			});
		} else {
			// Insert new prediction
			const id = randomUUID();

			await db.insert(predictions).values({
				id,
				userId,
				fixtureId: prediction.fixtureId,
				predictedHomeScore: prediction.homeScore,
				predictedAwayScore: prediction.awayScore,
				organizationId: userOrganizationId,
				createdAt: now
			});

			results.push({
				id,
				fixtureId: prediction.fixtureId
			});
		}
	}

	return results;
}

// Helper function to get user predictions for a specific week
export async function getUserPredictionsByWeek(
	userId: string,
	week: number,
	organizationId?: string
): Promise<UserPrediction[]> {
	// Get the user's active organization if not provided
	let userOrganizationId = organizationId;

	if (!userOrganizationId) {
		const activeOrgId = await getUserActiveOrganization(userId);
		userOrganizationId = activeOrgId || undefined;
	}

	if (!userOrganizationId) {
		return []; // Return empty array if no organization found
	}
	// Get fixture IDs for the specified week
	const weekFixtures = await db
		.select({ id: fixtures.id })
		.from(fixtures)
		.where(eq(fixtures.weekId, week));

	const fixtureIds = weekFixtures.map((fixture) => fixture.id);

	// Skip if no fixtures for this week
	if (fixtureIds.length === 0) {
		return [];
	}

	// Get user's predictions for these fixtures
	const userPredictions = await db
		.select({
			id: predictions.id,
			fixtureId: predictions.fixtureId,
			predictedHomeScore: predictions.predictedHomeScore,
			predictedAwayScore: predictions.predictedAwayScore,
			points: predictions.points,
			createdAt: predictions.createdAt
		})
		.from(predictions)
		.where(
			and(
				eq(predictions.userId, userId),
				inArray(predictions.fixtureId, fixtureIds),
				eq(predictions.organizationId, userOrganizationId)
			)
		);

	return userPredictions;
}

/**
 * Get the user's active organization ID from their session or default to their first organization
 */
async function getUserActiveOrganization(userId: string): Promise<string | null> {
	// Get the user's active organization from their session
	const userSession = await db
		.select({ activeOrganizationId: session.activeOrganizationId })
		.from(session)
		.where(eq(session.userId, userId))
		.limit(1);

	if (userSession.length > 0 && userSession[0].activeOrganizationId) {
		return userSession[0].activeOrganizationId;
	}

	// Fallback: get the user's first organization membership
	const userMembership = await db
		.select({ organizationId: member.organizationId })
		.from(member)
		.where(eq(member.userId, userId))
		.limit(1);

	if (userMembership.length === 0) {
		return null;
	}

	return userMembership[0].organizationId;
}
