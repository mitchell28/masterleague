import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	// Verify user is admin
	if (locals.user?.role !== 'admin') {
		throw error(403, 'Not authorized');
	}

	try {
		console.log('🔄 Starting 2025 season fixtures seeding via API...');

		// Import the seedFixturesWithSeasonYear function
		const { seedFixturesWithSeasonYear } = await import('$lib/server/football/fixtures/fixtureApi');

		// Seed 2025 fixtures
		await seedFixturesWithSeasonYear('2025');

		console.log('✅ 2025 season fixtures seeded successfully via API');

		return json({
			success: true,
			message: '2025 season fixtures seeded successfully'
		});
	} catch (err) {
		console.error('❌ Failed to seed 2025 fixtures:', err);

		return json(
			{
				success: false,
				message: `Failed to seed 2025 fixtures: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};
