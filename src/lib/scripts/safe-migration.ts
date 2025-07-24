/**
 * Safe Migration Script for Groups Feature
 *
 * This script safely migrates existing data to the new groups-based structure
 * without losing any existing predictions or league table data.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
	console.error('❌ DATABASE_URL environment variable is required');
	process.exit(1);
}

async function runSafeMigration() {
	console.log('🚀 Starting safe migration for groups feature...');

	// Create postgres client
	const client = postgres(dbUrl, { max: 1 });
	const db = drizzle(client);

	try {
		// Read the safe migration SQL
		const migrationSQL = readFileSync(
			join(process.cwd(), 'drizzle', '0008_safe_migration.sql'),
			'utf8'
		);

		console.log('📄 Executing safe migration SQL...');

		// Execute the migration
		await client.unsafe(migrationSQL);

		console.log('✅ Migration completed successfully!');
		console.log('');
		console.log('📊 Migration Summary:');
		console.log('• Created groups, group_memberships, and subscriptions tables');
		console.log('• Added stripe_customer_id to auth_user table');
		console.log('• Created default groups for existing users');
		console.log('• Migrated all existing predictions and league table data');
		console.log('• Added all necessary foreign key constraints');
		console.log('• Created performance indexes');
		console.log('');
		console.log('🎉 Your existing data has been preserved!');
		console.log('');
		console.log('Next steps:');
		console.log('1. Set up your Stripe environment variables');
		console.log('2. Test the groups functionality');
		console.log('3. Users can now create new groups or continue using their default group');
	} catch (error) {
		console.error('❌ Migration failed:', error);
		console.log('');
		console.log('🔄 To retry:');
		console.log('1. Fix any issues mentioned above');
		console.log('2. Run this script again');
		process.exit(1);
	} finally {
		await client.end();
	}
}

// Run the migration
runSafeMigration().catch(console.error);
