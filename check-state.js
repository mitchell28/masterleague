import { db } from './src/lib/server/db/index.js';
import { fixtures } from './src/lib/server/db/schema.js';
import { getCurrentWeek } from './src/lib/server/football/fixtures/fixtureUtils.js';

async function checkCurrentState() {
	try {
		console.log('🔍 Checking current app state...');

		// Get current week
		const currentWeek = await getCurrentWeek();
		console.log(`📅 Current week: ${currentWeek}`);

		// Get fixtures count by status
		const allFixtures = await db.select().from(fixtures);
		console.log(`📊 Total fixtures in database: ${allFixtures.length}`);

		// Group by status
		const statusCounts = allFixtures.reduce((acc, fixture) => {
			acc[fixture.status] = (acc[fixture.status] || 0) + 1;
			return acc;
		}, {});

		console.log('📈 Fixtures by status:');
		Object.entries(statusCounts).forEach(([status, count]) => {
			console.log(`  ${status}: ${count}`);
		});

		// Get week range
		const weeks = [...new Set(allFixtures.map((f) => f.weekId))].sort((a, b) => a - b);
		console.log(`📋 Available weeks: ${weeks.join(', ')}`);
		console.log(`📋 Week range: ${weeks[0]} - ${weeks[weeks.length - 1]}`);

		// Check a few upcoming fixtures
		const upcomingFixtures = allFixtures
			.filter((f) => f.status === 'upcoming' || f.status === 'SCHEDULED' || f.status === 'TIMED')
			.slice(0, 5);

		console.log('📅 Sample upcoming fixtures:');
		upcomingFixtures.forEach((f) => {
			console.log(`  Week ${f.weekId}: ${f.matchDate} - Status: ${f.status}`);
		});
	} catch (error) {
		console.error('❌ Error:', error);
	}
}

checkCurrentState();
