import { seedFixturesWithMatchId } from './src/lib/server/football/fixtures/fixtureApi';

async function test2025Seeding() {
	console.log('🔄 Testing 2025 fixtures seeding...');

	try {
		console.log('📅 Starting 2025 season fixtures seeding...');
		await seedFixturesWithMatchId('2025');

		console.log('✅ 2025 season fixtures seeded successfully!');
		process.exit(0);
	} catch (error) {
		console.error('❌ Failed to seed 2025 fixtures:', error);
		process.exit(1);
	}
}

test2025Seeding();
