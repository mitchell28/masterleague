#!/usr/bin/env tsx

/**
 * One-time script to mark all existing users as email verified
 * This is needed after enabling requireEmailVerification in Better Auth
 */

import { db } from '../src/lib/server/db/index.js';
import { user } from '../src/lib/server/db/auth/auth-schema.js';
import { eq } from 'drizzle-orm';

async function verifyExistingUsers() {
	console.log('🔍 Finding unverified users...');

	// Get all unverified users
	const unverifiedUsers = await db
		.select({ id: user.id, email: user.email, name: user.name })
		.from(user)
		.where(eq(user.emailVerified, false));

	console.log(`📊 Found ${unverifiedUsers.length} unverified users`);

	if (unverifiedUsers.length === 0) {
		console.log('✅ All users are already verified!');
		return;
	}

	// Show users that will be verified
	console.log('\n👥 Users to be verified:');
	for (const u of unverifiedUsers) {
		console.log(`   - ${u.name} (${u.email})`);
	}

	// Update all unverified users to verified
	const result = await db
		.update(user)
		.set({
			emailVerified: true,
			updatedAt: new Date()
		})
		.where(eq(user.emailVerified, false));

	console.log(`\n✅ Successfully verified ${unverifiedUsers.length} existing users!`);
	console.log('🎉 These users can now sign in normally.');
}

// Run the script
verifyExistingUsers()
	.then(() => {
		console.log('\n🏁 Script completed successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Script failed:', error);
		process.exit(1);
	});
