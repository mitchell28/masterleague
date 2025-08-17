import { db } from '../../src/lib/server/db/index.ts';
import { leaderboardMeta } from '../../src/lib/server/db/schema.ts';

async function checkMeta() {
	try {
		const results = await db.select().from(leaderboardMeta);
		console.log('Leaderboard Meta entries:', results.length);
		if (results.length > 0) {
			console.log('✅ SUCCESS! Database metadata populated:');
			console.log(JSON.stringify(results, null, 2));
		} else {
			console.log('❌ Database metadata still empty');
		}
	} catch (error) {
		console.error('Error:', error);
	}
	process.exit(0);
}

checkMeta();
