import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		console.log('🔍 Checking 2025 fixtures status...');

		// Import database functions
		const { db } = await import('$lib/server/db');
		const { fixtures } = await import('$lib/server/db/schema');

		// Check current fixture count
		const allFixtures = await db.select().from(fixtures);
		console.log(`📊 Total fixtures in database: ${allFixtures.length}`);

		// Check week 1 specifically
		const week1Fixtures = allFixtures.filter((f) => f.weekId === 1);
		console.log(`📅 Week 1 fixtures: ${week1Fixtures.length}`);

		// Check if we have 2025 fixtures (they should have match dates in 2025/2026)
		const fixtures2025 = allFixtures.filter((f) => {
			const date = new Date(f.matchDate);
			return date.getFullYear() >= 2025;
		});
		console.log(`🏆 2025-26 fixtures: ${fixtures2025.length}`);

		// Show first few week 1 fixtures for debugging
		const sampleFixtures = week1Fixtures.slice(0, 3).map((f) => ({
			id: f.id,
			homeTeamId: f.homeTeamId,
			awayTeamId: f.awayTeamId,
			matchDate: f.matchDate,
			status: f.status
		}));

		return json({
			success: true,
			total: allFixtures.length,
			week1Count: week1Fixtures.length,
			fixtures2025Count: fixtures2025.length,
			sampleWeek1: sampleFixtures
		});
	} catch (err) {
		console.error('❌ Error checking fixtures:', err);

		return json(
			{
				success: false,
				message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};
