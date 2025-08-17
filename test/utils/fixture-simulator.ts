/**
 * Fixture State Transition Simulator
 * For testing live game scenarios and state changes
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures } from '../../src/lib/server/db/schema.ts';
import { eq, and, or, sql } from 'drizzle-orm';

export class FixtureSimulator {
	private db: any;
	public organizationId: string;
	public season: string;

	constructor(organizationId = '8290a405-bef2-48d0-8b44-e1defdd1ae07', season = '2025') {
		const sqlConnection = neon(process.env.DATABASE_URL!);
		this.db = drizzle(sqlConnection);
		this.organizationId = organizationId;
		this.season = season;
	}

	log(emoji, message) {
		console.log(`${emoji} [${new Date().toISOString()}] ${message}`);
	}

	// =================== FIXTURE STATE MANIPULATION ===================

	async getFixturesByStatus(status = null) {
		try {
			const query = db.select().from(fixtures).where(eq(fixtures.season, this.season));

			if (status) {
				query.where(and(eq(fixtures.season, this.season), eq(fixtures.status, status)));
			}

			const result = await query;
			return result;
		} catch (error) {
			this.log('❌', `Error getting fixtures: ${error.message}`);
			return [];
		}
	}

	async transitionFixture(fixtureId, newStatus, scores = null) {
		try {
			const updateData = {
				status: newStatus,
				lastUpdated: new Date()
			};

			if (scores && newStatus === 'FINISHED') {
				updateData.homeScore = scores.home;
				updateData.awayScore = scores.away;
			}

			if (newStatus === 'IN_PLAY') {
				updateData.homeScore = scores?.home || null;
				updateData.awayScore = scores?.away || null;
			}

			if (newStatus === 'TIMED') {
				updateData.homeScore = null;
				updateData.awayScore = null;
			}

			await db.update(fixtures).set(updateData).where(eq(fixtures.id, fixtureId));

			this.log(
				'✅',
				`Fixture ${fixtureId} → ${newStatus}${scores ? ` (${scores.home}-${scores.away})` : ''}`
			);
			return true;
		} catch (error) {
			this.log('❌', `Error transitioning fixture ${fixtureId}: ${error.message}`);
			return false;
		}
	}

	// =================== SIMULATION SCENARIOS ===================

	async simulateKickoff(fixtureId) {
		this.log('⚽', `Simulating kickoff for fixture ${fixtureId}`);
		return await this.transitionFixture(fixtureId, 'IN_PLAY');
	}

	async simulateHalfTimeScore(fixtureId, homeScore, awayScore) {
		this.log('🏃', `Simulating half-time update: ${homeScore}-${awayScore}`);
		return await this.transitionFixture(fixtureId, 'IN_PLAY', { home: homeScore, away: awayScore });
	}

	async simulateFullTime(fixtureId, homeScore, awayScore) {
		this.log('🏁', `Simulating full-time: ${homeScore}-${awayScore}`);
		return await this.transitionFixture(fixtureId, 'FINISHED', {
			home: homeScore,
			away: awayScore
		});
	}

	async simulatePostponement(fixtureId) {
		this.log('⏸️', `Simulating postponement for fixture ${fixtureId}`);
		return await this.transitionFixture(fixtureId, 'POSTPONED');
	}

	async resetFixture(fixtureId) {
		this.log('🔄', `Resetting fixture ${fixtureId} to TIMED`);
		return await this.transitionFixture(fixtureId, 'TIMED');
	}

	// =================== BATCH OPERATIONS ===================

	async simulateMatchday(numberOfMatches = 3) {
		this.log('🏟️', `Simulating matchday with ${numberOfMatches} fixtures`);

		const timedFixtures = await this.getFixturesByStatus('TIMED');

		if (timedFixtures.length < numberOfMatches) {
			this.log('⚠️', `Only ${timedFixtures.length} TIMED fixtures available`);
			return false;
		}

		const selectedFixtures = timedFixtures.slice(0, numberOfMatches);

		// Phase 1: All kick off
		for (const fixture of selectedFixtures) {
			await this.simulateKickoff(fixture.id);
			await this.sleep(500); // Small delay for realism
		}

		// Phase 2: Half-time scores
		for (let i = 0; i < selectedFixtures.length; i++) {
			const fixture = selectedFixtures[i];
			const homeScore = Math.floor(Math.random() * 3);
			const awayScore = Math.floor(Math.random() * 3);
			await this.simulateHalfTimeScore(fixture.id, homeScore, awayScore);
			await this.sleep(300);
		}

		// Phase 3: Full-time (with possible additional goals)
		for (let i = 0; i < selectedFixtures.length; i++) {
			const fixture = selectedFixtures[i];

			// Get current scores from DB
			const currentFixture = await db
				.select()
				.from(fixtures)
				.where(eq(fixtures.id, fixture.id))
				.limit(1);

			let homeScore = currentFixture[0]?.homeScore || 0;
			let awayScore = currentFixture[0]?.awayScore || 0;

			// Random chance of additional goals
			if (Math.random() > 0.5) {
				homeScore += Math.floor(Math.random() * 2);
			}
			if (Math.random() > 0.5) {
				awayScore += Math.floor(Math.random() * 2);
			}

			await this.simulateFullTime(fixture.id, homeScore, awayScore);
			await this.sleep(300);
		}

		this.log('🎉', `Matchday simulation complete!`);
		return true;
	}

	async createTestScenarios() {
		this.log('🧪', 'Creating various test scenarios');

		const allFixtures = await this.getFixturesByStatus();

		if (allFixtures.length < 10) {
			this.log('⚠️', 'Need at least 10 fixtures for test scenarios');
			return false;
		}

		// Scenario 1: Mix of states
		await this.transitionFixture(allFixtures[0].id, 'TIMED');
		await this.transitionFixture(allFixtures[1].id, 'IN_PLAY', { home: 1, away: 0 });
		await this.transitionFixture(allFixtures[2].id, 'FINISHED', { home: 2, away: 1 });
		await this.transitionFixture(allFixtures[3].id, 'FINISHED', { home: 0, away: 3 });

		// Scenario 2: High-scoring game
		await this.transitionFixture(allFixtures[4].id, 'FINISHED', { home: 4, away: 4 });

		// Scenario 3: Clean sheet
		await this.transitionFixture(allFixtures[5].id, 'FINISHED', { home: 2, away: 0 });

		this.log('✅', 'Test scenarios created');
		return true;
	}

	async resetAllFixtures() {
		this.log('🔄', 'Resetting all fixtures to TIMED state');

		try {
			await db
				.update(fixtures)
				.set({
					status: 'TIMED',
					homeScore: null,
					awayScore: null,
					lastUpdated: new Date()
				})
				.where(eq(fixtures.season, this.season));

			this.log('✅', 'All fixtures reset to TIMED');
			return true;
		} catch (error) {
			this.log('❌', `Error resetting fixtures: ${error.message}`);
			return false;
		}
	}

	// =================== UTILITIES ===================

	async getFixtureStats() {
		try {
			const stats = await this.db
				.select({
					status: fixtures.status,
					count: sql<number>`count(*)`
				})
				.from(fixtures)
				.where(eq(fixtures.season, this.season))
				.groupBy(fixtures.status);

			this.log('📊', 'Current fixture distribution:');
			stats.forEach((stat) => {
				this.log('  📈', `${stat.status}: ${stat.count}`);
			});

			return stats;
		} catch (error) {
			this.log('❌', `Error getting stats: ${error.message}`);
			return [];
		}
	}

	sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// CLI Interface
if (import.meta.main) {
	const simulator = new FixtureSimulator();
	const command = process.argv[2];

	switch (command) {
		case 'stats':
			await simulator.getFixtureStats();
			break;
		case 'matchday':
			const numMatches = parseInt(process.argv[3]) || 3;
			await simulator.simulateMatchday(numMatches);
			break;
		case 'scenarios':
			await simulator.createTestScenarios();
			break;
		case 'reset':
			await simulator.resetAllFixtures();
			break;
		default:
			console.log('Usage: node fixture-simulator.js [stats|matchday|scenarios|reset]');
			console.log('  stats     - Show current fixture distribution');
			console.log('  matchday  - Simulate a complete matchday');
			console.log('  scenarios - Create test scenarios');
			console.log('  reset     - Reset all fixtures to TIMED');
	}
}
