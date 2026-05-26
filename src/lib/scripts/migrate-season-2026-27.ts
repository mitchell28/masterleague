/**
 * Season migration script: 2025-26 → 2026-27
 *
 * This script creates league table entries for all existing org members
 * for the new 2026-27 season. Previous season data is preserved.
 *
 * Run with: pnpm tsx src/lib/scripts/migrate-season-2026-27.ts
 */

import * as dotenv from 'dotenv';
import { db } from '$lib/server/db';
import { leagueTable } from '$lib/server/db/schema';
import { member, organization } from '$lib/server/db/auth/auth-schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

dotenv.config();

const NEW_SEASON = '2026-27';

async function migrateToNewSeason() {
	console.log(`\n🚀 Starting season migration to ${NEW_SEASON}...\n`);

	try {
		// 1. Get all organizations
		const orgs = await db.select().from(organization);
		console.log(`📋 Found ${orgs.length} organization(s)`);

		let totalCreated = 0;
		let totalSkipped = 0;

		for (const org of orgs) {
			console.log(`\n🏢 Processing org: ${org.name} (${org.id})`);

			// 2. Get all members of this org
			const members = await db.select().from(member).where(eq(member.organizationId, org.id));

			console.log(`   👥 Found ${members.length} member(s)`);

			for (const m of members) {
				// 3. Check if league table entry already exists for new season
				const existing = await db
					.select()
					.from(leagueTable)
					.where(
						and(
							eq(leagueTable.userId, m.userId),
							eq(leagueTable.organizationId, org.id),
							eq(leagueTable.season, NEW_SEASON)
						)
					)
					.limit(1);

				if (existing.length > 0) {
					console.log(`   ⏭️  Skipping user ${m.userId} - already has ${NEW_SEASON} entry`);
					totalSkipped++;
					continue;
				}

				// 4. Create new league table entry for the new season (starting fresh at 0)
				await db.insert(leagueTable).values({
					id: randomUUID(),
					userId: m.userId,
					organizationId: org.id,
					season: NEW_SEASON,
					totalPoints: 0,
					correctScorelines: 0,
					correctOutcomes: 0,
					predictedFixtures: 0,
					completedFixtures: 0,
					lastUpdated: new Date()
				});

				console.log(`   ✅ Created ${NEW_SEASON} entry for user ${m.userId}`);
				totalCreated++;
			}
		}

		console.log(`\n✅ Migration complete!`);
		console.log(`   Created: ${totalCreated} new league table entries`);
		console.log(`   Skipped: ${totalSkipped} (already existed)`);
		console.log(`   Previous season (2025-26) data preserved in database.\n`);
	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	}
}

migrateToNewSeason().catch(console.error);
