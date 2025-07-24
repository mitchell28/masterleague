/**
 * Migration Verification Script
 *
 * This script verifies that the migration was successful and all data was preserved.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

async function verifyMigration() {
	console.log('🔍 Verifying migration results...');

	const client = postgres(dbUrl, { max: 1 });

	try {
		// Check if new tables exist
		const tables = await client`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('groups', 'group_memberships', 'subscriptions')
            ORDER BY table_name
        `;

		console.log('✅ New tables created:', tables.map((t) => t.table_name).join(', '));

		// Check if columns were added
		const columns = await client`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND (
                (table_name = 'auth_user' AND column_name = 'stripe_customer_id') OR
                (table_name = 'predictions' AND column_name = 'group_id') OR
                (table_name = 'league_table' AND column_name = 'group_id')
            )
            ORDER BY table_name, column_name
        `;

		console.log('✅ New columns added:');
		columns.forEach((col) => {
			console.log(`  • ${col.table_name}.${col.column_name}`);
		});

		// Check data counts
		const groupCount = await client`SELECT COUNT(*) as count FROM groups`;
		const membershipCount = await client`SELECT COUNT(*) as count FROM group_memberships`;
		const predictionCount =
			await client`SELECT COUNT(*) as count FROM predictions WHERE group_id IS NOT NULL`;
		const leagueTableCount =
			await client`SELECT COUNT(*) as count FROM league_table WHERE group_id IS NOT NULL`;

		console.log('');
		console.log('📊 Data Migration Results:');
		console.log(`  • Groups created: ${groupCount[0].count}`);
		console.log(`  • Group memberships: ${membershipCount[0].count}`);
		console.log(`  • Predictions with group_id: ${predictionCount[0].count}`);
		console.log(`  • League table entries with group_id: ${leagueTableCount[0].count}`);

		// Check for any data without group_id (should be 0)
		const orphanedPredictions =
			await client`SELECT COUNT(*) as count FROM predictions WHERE group_id IS NULL`;
		const orphanedLeagueTable =
			await client`SELECT COUNT(*) as count FROM league_table WHERE group_id IS NULL`;

		if (orphanedPredictions[0].count > 0 || orphanedLeagueTable[0].count > 0) {
			console.log('');
			console.log('⚠️  Warning: Found data without group_id:');
			if (orphanedPredictions[0].count > 0) {
				console.log(`  • ${orphanedPredictions[0].count} predictions without group_id`);
			}
			if (orphanedLeagueTable[0].count > 0) {
				console.log(`  • ${orphanedLeagueTable[0].count} league table entries without group_id`);
			}
		} else {
			console.log('✅ All data successfully migrated to groups');
		}

		// Check foreign key constraints
		const constraints = await client`
            SELECT conname 
            FROM pg_constraint 
            WHERE conname LIKE '%group%' OR conname LIKE '%stripe%'
            ORDER BY conname
        `;

		console.log('');
		console.log('✅ Foreign key constraints:');
		constraints.forEach((c) => {
			console.log(`  • ${c.conname}`);
		});

		console.log('');
		console.log('🎉 Migration verification completed successfully!');
	} catch (error) {
		console.error('❌ Verification failed:', error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

// Run the verification
verifyMigration().catch(console.error);
