import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures, predictions, leagueTable, authUser } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function addSeasonTracking() {
	try {
		console.log('🔄 Adding season tracking to database...');

		// Add season column to fixtures table
		await sql`ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS season VARCHAR(10) DEFAULT '2024-25'`;

		// Add season column to predictions table
		await sql`ALTER TABLE predictions ADD COLUMN IF NOT EXISTS season VARCHAR(10) DEFAULT '2024-25'`;

		// Add season column to league_table
		await sql`ALTER TABLE league_table ADD COLUMN IF NOT EXISTS season VARCHAR(10) DEFAULT '2024-25'`;

		console.log('✅ Season columns added successfully');

		// Update existing 2024 data to have proper season labels
		console.log('🔄 Updating existing data with 2024-25 season labels...');

		// Update existing fixtures to 2024-25 season
		await sql`UPDATE fixtures SET season = '2024-25' WHERE season IS NULL OR season = ''`;

		// Update existing predictions to 2024-25 season
		await sql`UPDATE predictions SET season = '2024-25' WHERE season IS NULL OR season = ''`;

		// Update existing league table entries to 2024-25 season
		await sql`UPDATE league_table SET season = '2024-25' WHERE season IS NULL OR season = ''`;

		console.log('✅ Existing data updated with 2024-25 season labels');

		// Now update all 2025 fixtures to have the correct season
		await sql`UPDATE fixtures SET season = '2025-26' WHERE match_date >= '2025-08-15'`;

		console.log('✅ 2025 fixtures updated with 2025-26 season labels');

		// Create separate league table entries for 2025 season
		console.log('🔄 Creating 2025 season league table entries...');

		// First, add the unique constraint
		try {
			await sql`
				ALTER TABLE league_table 
				ADD CONSTRAINT IF NOT EXISTS league_table_user_season_unique 
				UNIQUE (user_id, season)
			`;
			console.log('✅ Added unique constraint for user_id + season');
		} catch (error) {
			console.log('⚠️ Unique constraint may already exist or will be handled by schema');
		}

		// Get all users from 2024 season
		const users2024 = await sql`SELECT DISTINCT user_id FROM league_table WHERE season = '2024-25'`;

		// Create fresh league table entries for 2025 season
		for (const user of users2024) {
			try {
				await sql`
					INSERT INTO league_table (user_id, total_points, predicted_fixtures, completed_fixtures, season, correct_scorelines, correct_outcomes, last_updated, group_id)
					SELECT ${user.user_id}, 0, 0, 0, '2025-26', 0, 0, NOW(), group_id
					FROM league_table 
					WHERE user_id = ${user.user_id} AND season = '2024-25'
					LIMIT 1
				`;
			} catch (error) {
				// Entry might already exist, skip
				console.log(`User ${user.user_id} already has 2025 entry`);
			}
		}

		console.log(`✅ Created 2025 season league entries for ${users2024.length} users`);

		// Show summary
		const stats2024 = await sql`SELECT COUNT(*) as count FROM fixtures WHERE season = '2024-25'`;
		const stats2025 = await sql`SELECT COUNT(*) as count FROM fixtures WHERE season = '2025-26'`;
		const league2024 =
			await sql`SELECT COUNT(*) as count FROM league_table WHERE season = '2024-25'`;
		const league2025 =
			await sql`SELECT COUNT(*) as count FROM league_table WHERE season = '2025-26'`;

		console.log('\n📊 SEASON TRACKING SUMMARY:');
		console.log(
			`🏆 2024-25 Season: ${stats2024[0].count} fixtures, ${league2024[0].count} league entries`
		);
		console.log(
			`🆕 2025-26 Season: ${stats2025[0].count} fixtures, ${league2025[0].count} league entries`
		);
	} catch (error) {
		console.error('❌ Error adding season tracking:', error);
		process.exit(1);
	}
}

addSeasonTracking().catch(console.error);
