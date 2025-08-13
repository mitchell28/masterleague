import { db } from '$lib/server/db';
import { leagueTable } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function addUserToLeagueTable(
	userId: string,
	organizationId: string,
	season = '2025-26'
) {
	// Check if user already exists in league table for this org/season
	const existingEntry = await db
		.select()
		.from(leagueTable)
		.where(
			and(
				eq(leagueTable.userId, userId),
				eq(leagueTable.organizationId, organizationId),
				eq(leagueTable.season, season)
			)
		)
		.limit(1);

	if (existingEntry.length > 0) {
		return existingEntry[0]; // Already exists
	}

	// Create new league table entry
	const [newEntry] = await db
		.insert(leagueTable)
		.values({
			id: randomUUID(),
			userId,
			organizationId,
			season,
			totalPoints: 0,
			correctScorelines: 0,
			correctOutcomes: 0,
			predictedFixtures: 0,
			completedFixtures: 0,
			lastUpdated: new Date()
		})
		.returning();

	return newEntry;
}

export async function removeUserFromLeagueTable(
	userId: string,
	organizationId: string,
	season = '2025-26'
) {
	return await db
		.delete(leagueTable)
		.where(
			and(
				eq(leagueTable.userId, userId),
				eq(leagueTable.organizationId, organizationId),
				eq(leagueTable.season, season)
			)
		);
}
