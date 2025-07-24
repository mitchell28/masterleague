import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { authUser, authSession } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function testAuthFlow() {
	try {
		console.log('🔍 Testing authentication flow...');

		// Check if we have active sessions
		const activeSessions = await db.select().from(authSession).limit(5);
		console.log(`\n📊 Active sessions: ${activeSessions.length}`);

		activeSessions.forEach((s, i) => {
			console.log(`   ${i + 1}. User: ${s.userId}`);
			console.log(`      Expires: ${s.expiresAt}`);
			console.log(`      Active: ${new Date() < new Date(s.expiresAt)}`);
		});

		// Get a sample user to test with
		const sampleUser = await db.select().from(authUser).limit(1);
		if (sampleUser.length > 0) {
			const user = sampleUser[0];
			console.log(`\n👤 Sample user for testing:`);
			console.log(`   Name: ${user.name}`);
			console.log(`   Email: ${user.email}`);
			console.log(`   ID: ${user.id}`);
			console.log(`   Verified: ${user.emailVerified}`);
		}

		console.log('\n💡 Try these steps:');
		console.log('   1. Go to http://localhost:5173/auth/otp');
		console.log('   2. Enter email from above');
		console.log('   3. Check your email for OTP');
		console.log('   4. After login, try http://localhost:5173/leaderboard');
		console.log('   5. Check the terminal logs for the debug output we added');
	} catch (error) {
		console.error('❌ Auth flow test failed:', error);
	}
}

testAuthFlow().catch(console.error);
