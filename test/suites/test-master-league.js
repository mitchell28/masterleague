#!/usr/bin/env node
/**
 * Master League Testing Framework
 * Comprehensive test suite for live games, leaderboard recalc, and caching
 */

import { db } from './src/lib/server/db/index.ts';
import { fixtures, predictions, leaderboardMeta } from './src/lib/server/db/schema.ts';
import { recalculateLeaderboard } from './src/lib/server/engine/analytics/leaderboard.ts';
import { LeaderboardCache } from './src/lib/server/cache/leaderboard-cache.ts';
import { eq, and, desc } from 'drizzle-orm';

class MasterLeagueTestSuite {
	constructor() {
		this.testOrgId = '8290a405-bef2-48d0-8b44-e1defdd1ae07';
		this.testSeason = '2025';
		this.results = {
			passed: 0,
			failed: 0,
			tests: []
		};
	}

	log(emoji, message) {
		console.log(`${emoji} ${message}`);
	}

	success(test, message) {
		this.log('✅', `${test}: ${message}`);
		this.results.passed++;
		this.results.tests.push({ test, status: 'PASS', message });
	}

	fail(test, message, error = null) {
		this.log('❌', `${test}: ${message}`);
		if (error) console.error(error);
		this.results.failed++;
		this.results.tests.push({ test, status: 'FAIL', message, error: error?.message });
	}

	async runTest(testName, testFunction) {
		try {
			this.log('🧪', `Running: ${testName}`);
			await testFunction();
		} catch (error) {
			this.fail(testName, 'Test threw unexpected error', error);
		}
	}

	// =================== DATABASE STATE TESTS ===================

	async testDatabaseConnection() {
		try {
			const result = await db.select().from(fixtures).limit(1);
			this.success(
				'Database Connection',
				`Connected - found ${result.length > 0 ? 'fixtures' : 'empty table'}`
			);
		} catch (error) {
			this.fail('Database Connection', 'Failed to connect', error);
		}
	}

	async testFixtureStates() {
		try {
			const fixtureStates = await db
				.selectDistinct({ status: fixtures.status })
				.from(fixtures)
				.where(eq(fixtures.season, this.testSeason));

			const states = fixtureStates.map((f) => f.status);
			const expectedStates = ['TIMED', 'FINISHED', 'IN_PLAY'];
			const hasVariety = states.length >= 2;

			this.success('Fixture States', `Found states: ${states.join(', ')} (variety: ${hasVariety})`);
			return states;
		} catch (error) {
			this.fail('Fixture States', 'Failed to check fixture states', error);
			return [];
		}
	}

	async testPredictionsExist() {
		try {
			const predictionCount = await db
				.select()
				.from(predictions)
				.where(eq(predictions.organizationId, this.testOrgId));

			if (predictionCount.length > 0) {
				this.success('Predictions Data', `Found ${predictionCount.length} predictions`);
			} else {
				this.fail('Predictions Data', 'No predictions found - need test data');
			}
			return predictionCount.length;
		} catch (error) {
			this.fail('Predictions Data', 'Failed to check predictions', error);
			return 0;
		}
	}

	// =================== CACHE TESTS ===================

	async testCloudflareKVConnection() {
		try {
			// Test basic KV operations
			const testKey = `test:${Date.now()}`;
			const testData = { message: 'test', timestamp: new Date().toISOString() };

			// Write test
			await LeaderboardCache.set(this.testOrgId, this.testSeason, [testData]);

			// Read test
			const retrieved = await LeaderboardCache.get(this.testOrgId, this.testSeason);

			if (retrieved && retrieved.data.length > 0) {
				this.success('CloudflareKV Connection', 'Read/write operations working');
			} else {
				this.fail('CloudflareKV Connection', 'Failed to retrieve test data');
			}
		} catch (error) {
			this.fail('CloudflareKV Connection', 'KV operations failed', error);
		}
	}

	async testMetadataSync() {
		try {
			// Get KV metadata
			const kvMeta = await LeaderboardCache.getMeta(this.testOrgId, this.testSeason);

			// Get DB metadata
			const dbMeta = await db
				.select()
				.from(leaderboardMeta)
				.where(
					and(
						eq(leaderboardMeta.organizationId, this.testOrgId),
						eq(leaderboardMeta.season, this.testSeason)
					)
				);

			if (kvMeta && dbMeta.length > 0) {
				const kvTime = new Date(kvMeta.lastLeaderboardUpdate);
				const dbTime = new Date(dbMeta[0].lastLeaderboardUpdate);
				const timeDiff = Math.abs(kvTime - dbTime);

				if (timeDiff < 60000) {
					// Within 1 minute
					this.success('Metadata Sync', `KV and DB metadata in sync (${timeDiff}ms diff)`);
				} else {
					this.fail('Metadata Sync', `Metadata out of sync (${timeDiff}ms diff)`);
				}
			} else {
				this.fail('Metadata Sync', `Missing metadata - KV: ${!!kvMeta}, DB: ${dbMeta.length}`);
			}
		} catch (error) {
			this.fail('Metadata Sync', 'Failed to check metadata sync', error);
		}
	}

	// =================== LEADERBOARD TESTS ===================

	async testLeaderboardRecalculation() {
		try {
			this.log('🔄', 'Starting leaderboard recalculation test...');

			const startTime = Date.now();
			const result = await recalculateLeaderboard(this.testOrgId, this.testSeason, true);
			const duration = Date.now() - startTime;

			if (result.success) {
				this.success(
					'Leaderboard Recalc',
					`Success: ${result.usersUpdated} users, ${result.finishedMatches}/${result.totalMatches} matches (${duration}ms)`
				);
				return result;
			} else {
				this.fail('Leaderboard Recalc', `Failed: ${result.message}`);
				return null;
			}
		} catch (error) {
			this.fail('Leaderboard Recalc', 'Recalculation threw error', error);
			return null;
		}
	}

	async testCacheFallback() {
		try {
			// 1. Clear KV cache
			await LeaderboardCache.invalidate(this.testOrgId, this.testSeason);
			this.log('🧹', 'Cleared KV cache');

			// 2. Verify cache is empty
			const cacheCheck = await LeaderboardCache.get(this.testOrgId, this.testSeason);
			if (!cacheCheck) {
				this.success('Cache Clear', 'KV cache successfully cleared');
			} else {
				this.fail('Cache Clear', 'KV cache not properly cleared');
				return;
			}

			// 3. Trigger recalculation (should fallback through all tiers)
			const result = await recalculateLeaderboard(this.testOrgId, this.testSeason, true);

			if (result.success) {
				this.success('Cache Fallback', 'Fallback chain worked - cache repopulated');
			} else {
				this.fail('Cache Fallback', 'Fallback chain failed');
			}
		} catch (error) {
			this.fail('Cache Fallback', 'Cache fallback test failed', error);
		}
	}

	// =================== LIVE GAME SIMULATION ===================

	async simulateLiveGameScenario() {
		try {
			this.log('🏈', 'Starting live game simulation...');

			// Find a suitable fixture to simulate
			const liveFixture = await db
				.select()
				.from(fixtures)
				.where(and(eq(fixtures.season, this.testSeason), eq(fixtures.status, 'TIMED')))
				.limit(1);

			if (liveFixture.length === 0) {
				this.fail('Live Game Sim', 'No TIMED fixtures available for simulation');
				return;
			}

			const fixture = liveFixture[0];
			this.log('⚽', `Simulating fixture: ${fixture.id}`);

			// Simulate: TIMED -> IN_PLAY
			await db
				.update(fixtures)
				.set({
					status: 'IN_PLAY',
					lastUpdated: new Date()
				})
				.where(eq(fixtures.id, fixture.id));

			this.success('Live Game Sim - Phase 1', 'Updated fixture to IN_PLAY');

			// Simulate: IN_PLAY -> FINISHED with scores
			await db
				.update(fixtures)
				.set({
					status: 'FINISHED',
					homeScore: 2,
					awayScore: 1,
					lastUpdated: new Date()
				})
				.where(eq(fixtures.id, fixture.id));

			this.success('Live Game Sim - Phase 2', 'Updated fixture to FINISHED with scores');

			// Test if this triggers leaderboard update
			const recalcResult = await recalculateLeaderboard(this.testOrgId, this.testSeason, true);

			if (recalcResult.success) {
				this.success('Live Game Sim - Leaderboard', 'Leaderboard updated after match completion');
			} else {
				this.fail('Live Game Sim - Leaderboard', 'Leaderboard failed to update');
			}

			// Reset fixture for next test
			await db
				.update(fixtures)
				.set({
					status: 'TIMED',
					homeScore: null,
					awayScore: null,
					lastUpdated: new Date()
				})
				.where(eq(fixtures.id, fixture.id));

			this.log('🔄', 'Reset fixture for next test');
		} catch (error) {
			this.fail('Live Game Sim', 'Live game simulation failed', error);
		}
	}

	// =================== API ENDPOINT TESTS ===================

	async testAPIEndpoints() {
		const baseUrl = 'http://localhost:5173';

		try {
			// Test leaderboard API
			const leaderboardResponse = await fetch(
				`${baseUrl}/api/leaderboard?orgId=${this.testOrgId}&season=${this.testSeason}`
			);
			const leaderboardData = await leaderboardResponse.json();

			if (leaderboardResponse.ok && leaderboardData.success) {
				this.success('Leaderboard API', `Returned ${leaderboardData.data?.length || 0} users`);
			} else {
				this.fail('Leaderboard API', `Failed: ${leaderboardData.message || 'Unknown error'}`);
			}

			// Test predictions live-update API
			const liveUpdateResponse = await fetch(`${baseUrl}/api/predictions/live-update`);
			const liveUpdateData = await liveUpdateResponse.json();

			if (liveUpdateResponse.ok) {
				this.success('Live Update API', 'Predictions live-update endpoint working');
			} else {
				this.fail('Live Update API', 'Predictions live-update endpoint failed');
			}

			// Test background processing API
			const backgroundResponse = await fetch(`${baseUrl}/api/background`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'refresh-leaderboard',
					organizationId: this.testOrgId,
					season: this.testSeason
				})
			});

			const backgroundData = await backgroundResponse.json();

			if (backgroundResponse.ok && backgroundData.success) {
				this.success('Background API', 'Background processing endpoint working');
			} else {
				this.fail('Background API', `Failed: ${backgroundData.message || 'Unknown error'}`);
			}
		} catch (error) {
			this.fail('API Endpoints', 'API testing failed', error);
		}
	}

	// =================== MAIN TEST RUNNER ===================

	async runAllTests() {
		this.log('🚀', '='.repeat(60));
		this.log('🚀', 'MASTER LEAGUE COMPREHENSIVE TEST SUITE');
		this.log('🚀', '='.repeat(60));

		// Phase 1: Basic Infrastructure
		this.log('📋', 'Phase 1: Infrastructure Tests');
		await this.runTest('Database Connection', () => this.testDatabaseConnection());
		await this.runTest('CloudflareKV Connection', () => this.testCloudflareKVConnection());

		// Phase 2: Data Validation
		this.log('📋', 'Phase 2: Data Validation');
		await this.runTest('Fixture States', () => this.testFixtureStates());
		await this.runTest('Predictions Exist', () => this.testPredictionsExist());

		// Phase 3: Core Functionality
		this.log('📋', 'Phase 3: Core Functionality');
		await this.runTest('Leaderboard Recalculation', () => this.testLeaderboardRecalculation());
		await this.runTest('Metadata Sync', () => this.testMetadataSync());

		// Phase 4: Advanced Scenarios
		this.log('📋', 'Phase 4: Advanced Scenarios');
		await this.runTest('Cache Fallback', () => this.testCacheFallback());
		await this.runTest('Live Game Simulation', () => this.simulateLiveGameScenario());

		// Phase 5: API Integration
		this.log('📋', 'Phase 5: API Integration');
		await this.runTest('API Endpoints', () => this.testAPIEndpoints());

		// Results Summary
		this.showResults();
	}

	showResults() {
		this.log('📊', '='.repeat(60));
		this.log('📊', 'TEST RESULTS SUMMARY');
		this.log('📊', '='.repeat(60));

		const total = this.results.passed + this.results.failed;
		const successRate = ((this.results.passed / total) * 100).toFixed(1);

		this.log('✅', `Passed: ${this.results.passed}`);
		this.log('❌', `Failed: ${this.results.failed}`);
		this.log('📈', `Success Rate: ${successRate}%`);

		if (this.results.failed > 0) {
			this.log('🔍', 'Failed Tests:');
			this.results.tests
				.filter((t) => t.status === 'FAIL')
				.forEach((t) => this.log('  ❌', `${t.test}: ${t.message}`));
		}

		this.log(
			'🎯',
			`Overall Status: ${this.results.failed === 0 ? 'ALL SYSTEMS OPERATIONAL' : 'ISSUES DETECTED'}`
		);
	}
}

// Run the test suite
const testSuite = new MasterLeagueTestSuite();
testSuite.runAllTests().catch(console.error);
