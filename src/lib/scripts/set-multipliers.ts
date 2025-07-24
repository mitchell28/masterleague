import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { setRandomMultipliersForWeek } from '../server/football/fixtures/fixtureRepository';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function setMultipliers() {
	console.log('🎯 Setting random multipliers for week 1...');

	try {
		await setRandomMultipliersForWeek(1);
		console.log('✅ Multipliers set successfully!');

		// Verify the changes
		console.log('\n🔍 Verifying multipliers...');

		// Now run our check script
		const { execSync } = await import('child_process');
		execSync('pnpm tsx src/lib/scripts/check-fixtures.ts', { stdio: 'inherit' });
	} catch (error) {
		console.error('❌ Error setting multipliers:', error);
	}
}

setMultipliers();
