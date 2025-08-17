import { db, leagueTable } from './src/lib/server/db/index.js';

async function testDatabaseDirectly() {
	try {
		console.log('Querying leagueTable directly...');
		const leagueData = await db.select().from(leagueTable).limit(10);
		console.log('League table data:');
		console.log('Count:', leagueData.length);
		console.log('Data:', JSON.stringify(leagueData, null, 2));
	} catch (error) {
		console.error('Error:', error);
	}
}

testDatabaseDirectly();
