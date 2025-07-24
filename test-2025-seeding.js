import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function test2025Seeding() {
	console.log('🔄 Testing 2025 fixtures seeding...');

	try {
		// Direct import and execution
		const { seedFixturesWithMatchId } = await import(
			'./src/lib/server/football/fixtures/fixtureApi.js'
		);

		console.log('📅 Starting 2025 season fixtures seeding...');
		await seedFixturesWithMatchId('2025');

		console.log('✅ 2025 season fixtures seeded successfully!');
	} catch (error) {
		console.error('❌ Failed to seed 2025 fixtures:', error);
		process.exit(1);
	}
}

test2025Seeding();
