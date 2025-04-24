/**
 * Script to fix any fixtures with missing scores or incorrect statuses
 * This is a general-purpose script that works for all games, not just specific ones
 */

import * as dotenv from 'dotenv';
import './db-connection';
import { recoverMissedFixtures } from '$lib/server/football/predictions/fixtureUpdateService';

// Load environment variables
dotenv.config();

async function fixMissingScores() {
	console.log('🔄 Starting scan for fixtures with missing scores or incorrect statuses...');

	try {
		const result = await recoverMissedFixtures();

		if (result.updated > 0 || result.reprocessedPredictions > 0) {
			console.log('✅ Successfully updated fixtures with missing information!');
			console.log(`Scanned ${result.scanned} fixtures`);
			console.log(`Updated ${result.updated} fixtures with new information from the API`);
			console.log(
				`Reprocessed ${result.reprocessedPredictions} predictions that needed point calculations`
			);
		} else {
			console.log('ℹ️ No fixtures needed updates at this time.');
			console.log(`Scanned ${result.scanned} fixtures but none required changes`);
		}
	} catch (error) {
		console.error('❌ Error fixing fixtures with missing scores:', error);
	}
}

// Run the script
fixMissingScores()
	.then(() => {
		console.log('Script execution complete');
		process.exit(0);
	})
	.catch((err) => {
		console.error('Script failed:', err);
		process.exit(1);
	});
