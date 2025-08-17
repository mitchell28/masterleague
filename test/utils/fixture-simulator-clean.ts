/**
 * Fixture State Transition Simulator
 * For testing live game scenarios and state changes
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures } from '../../src/lib/server/db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';

interface ScoreData {
	home: number;
	away: number;
}

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

	log(emoji: string, message: string) {
		console.log(`${emoji} [${new Date().toISOString()}] ${message}`);
	}

	// =================== FIXTURE STATE MANIPULATION ===================

	async getFixturesByStatus(status: string | null = null) {
		try {
			if (status) {
				const result = await this.db
					.select()
					.from(fixtures)
					.where(and(eq(fixtures.season, this.season), eq(fixtures.status, status)));
				return result;
			} else {
				const result = await this.db
					.select()
					.from(fixtures)
					.where(eq(fixtures.season, this.season));
				return result;
			}
		} catch (error: any) {
			this.log('❌', `Error getting fixtures: ${error.message}`);
			return [];
		}
	}

	async transitionFixture(fixtureId: string, newStatus: string, scores: ScoreData | null = null) {
		try {
			const updateData: any = {
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

			await this.db.update(fixtures).set(updateData).where(eq(fixtures.id, fixtureId));

			this.log(
				'✅',
				`Fixture ${fixtureId} → ${newStatus}${scores ? ` (${scores.home}-${scores.away})` : ''}`
			);
			return true;
		} catch (error: any) {
			this.log('❌', `Error transitioning fixture ${fixtureId}: ${error.message}`);
			return false;
		}
	}

	// =================== SIMULATION SCENARIOS ===================

	async simulateKickoff(fixtureId: string) {
		this.log('⚽', `Simulating kickoff for fixture ${fixtureId}`);
		return await this.transitionFixture(fixtureId, 'IN_PLAY');
	}

	async simulateHalfTimeScore(fixtureId: string, homeScore: number, awayScore: number) {
		this.log('🏃', `Simulating half-time update: ${homeScore}-${awayScore}`);
		return await this.transitionFixture(fixtureId, 'IN_PLAY', { home: homeScore, away: awayScore });
	}

	async simulateFullTime(fixtureId: string, homeScore: number, awayScore: number) {
		this.log('🏁', `Simulating full-time: ${homeScore}-${awayScore}`);
		return await this.transitionFixture(fixtureId, 'FINISHED', {
			home: homeScore,
			away: awayScore
		});
	}

	async resetFixture(fixtureId: string) {
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
			const currentFixture = await this.db
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

	async resetAllFixtures() {
		this.log('🔄', 'Resetting all fixtures to TIMED state');

		try {
			await this.db
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
		} catch (error: any) {
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
			stats.forEach((stat: any) => {
				this.log('  📈', `${stat.status}: ${stat.count}`);
			});

			return stats;
		} catch (error: any) {
			this.log('❌', `Error getting stats: ${error.message}`);
			return [];
		}
	}

	sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
	const simulator = new FixtureSimulator();
	const command = process.argv[2];

	(async () => {
		switch (command) {
			case 'stats':
				await simulator.getFixtureStats();
				break;
			case 'matchday':
				const numMatches = parseInt(process.argv[3]) || 3;
				await simulator.simulateMatchday(numMatches);
				break;
			case 'reset':
				await simulator.resetAllFixtures();
				break;
			default:
				console.log('Usage: npx tsx fixture-simulator.ts [stats|matchday|reset]');
				console.log('  stats     - Show current fixture distribution');
				console.log('  matchday  - Simulate a complete matchday');
				console.log('  reset     - Reset all fixtures to TIMED');
		}
	})().catch(console.error);
}
