import type { Fixture } from '../../../db/schema';
import { fixtures, predictions } from '../../../db/schema';
import { db } from '../../../db';
import { eq, inArray as drizzleInArray, and, gt, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Get all fixtures for a specific week
 */
export async function getFixturesByWeek(weekId: number): Promise<Fixture[]> {
	// Get all fixtures for this week, regardless of status
	return db.select().from(fixtures).where(eq(fixtures.weekId, weekId));
}

/**
 * Get 3 upcoming fixtures for a specific team
 * @param teamId - The ID of the team to get fixtures for
 * @param limit - Maximum number of fixtures to return (default is 3)
 * @returns Array of fixtures for the team
 */
export async function getUpcomingFixturesForTeam(teamId: string, limit = 3): Promise<Fixture[]> {
	const now = new Date();

	return db
		.select()
		.from(fixtures)
		.where(
			and(
				or(eq(fixtures.homeTeamId, teamId), eq(fixtures.awayTeamId, teamId)),
				eq(fixtures.status, 'SCHEDULED'),
				gt(fixtures.matchDate, now)
			)
		)
		.orderBy(fixtures.matchDate)
		.limit(limit);
}

/**
 * Get a fixture by ID
 */
export async function getFixtureById(id: string): Promise<Fixture | undefined> {
	const result = await db.select().from(fixtures).where(eq(fixtures.id, id));
	return result[0];
}

/**
 * Update fixture results with home and away scores
 */
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
			status: 'FINISHED'
		})
		.where(eq(fixtures.id, fixtureId));

	return getFixtureById(fixtureId);
}

/**
 * Delete fixtures for a specific week
 */
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

/**
 * Set random multipliers for fixtures in a specific week
 */
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
 * Update multipliers for the current week's fixtures
 */
export async function updateCurrentWeekMultipliers(currentWeek: number): Promise<boolean> {
	try {
		await setRandomMultipliersForWeek(currentWeek);
		return true;
	} catch (error) {
		console.error('Error updating current week multipliers:', error);
		return false;
	}
}

/**
 * Update multipliers for all weeks' fixtures
 */
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
