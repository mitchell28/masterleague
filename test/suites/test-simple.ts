/**
 * Simplified Master League Test Suite
 * Tests core database functionality without SvelteKit dependencies
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, desc, sql } from 'drizzle-orm';

// Import schema directly
import { fixtures, predictions, leaderboardMeta } from '../../src/lib/server/db/schema.ts';

interface TestResult {
	test: string;
	status: 'PASS' | 'FAIL';
	message: string;
	error?: string;
}

class SimplifiedTestSuite {
	private db: any;
	private testOrgId = '8290a405-bef2-48d0-8b44-e1defdd1ae07';
	private testSeason = '2025-26';
	private results = {
		passed: 0,
		failed: 0,
		tests: [] as TestResult[]
	};

	constructor() {
		// Initialize database connection
		const sql = neon(process.env.DATABASE_URL!);
		this.db = drizzle(sql);
	}

	log(emoji: string, message: string) {
		console.log(`${emoji} ${message}`);
	}

	success(test: string, message: string) {
		this.log('✅', `${test}: ${message}`);
		this.results.passed++;
		this.results.tests.push({ test, status: 'PASS', message });
	}

	fail(test: string, message: string, error: Error | null = null) {
		this.log('❌', `${test}: ${message}`);
		if (error) console.error(error);
		this.results.failed++;
		this.results.tests.push({ test, status: 'FAIL', message, error: error?.message });
	}

	async runTest(testName: string, testFunction: () => Promise<any>) {
		try {
			this.log('🧪', `Running: ${testName}`);
			await testFunction();
		} catch (error) {
			this.fail(testName, 'Test threw unexpected error', error as Error);
		}
	}

	// =================== DATABASE TESTS ===================

	async testDatabaseConnection() {
		try {
			const result = await this.db.select().from(fixtures).limit(1);
			this.success(
				'Database Connection',
				`Connected - found ${result.length > 0 ? 'fixtures' : 'empty table'}`
			);
		} catch (error) {
			this.fail('Database Connection', 'Failed to connect', error as Error);
		}
	}

	async testFixtureStates() {
		try {
			const fixtureStates = await this.db
				.selectDistinct({ status: fixtures.status })
				.from(fixtures)
				.where(eq(fixtures.season, this.testSeason));

			const states = fixtureStates.map((f: any) => f.status);
			const hasVariety = states.length >= 2;

			this.success('Fixture States', `Found states: ${states.join(', ')} (variety: ${hasVariety})`);
			return states;
		} catch (error) {
			this.fail('Fixture States', 'Failed to check fixture states', error as Error);
			return [];
		}
	}

	async testPredictionsExist() {
		try {
			const predictionCount = await this.db
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
			this.fail('Predictions Data', 'Failed to check predictions', error as Error);
			return 0;
		}
	}

	async testSeasonConsistency() {
		try {
			// Check fixture seasons
			const fixtureSeasons = await this.db
				.selectDistinct({ season: fixtures.season })
				.from(fixtures);

			// Check for the expected season format
			const hasCorrectSeason = fixtureSeasons.some((f: any) => f.season === this.testSeason);
			const allSeasons = fixtureSeasons.map((f: any) => f.season);

			if (hasCorrectSeason) {
				this.success(
					'Season Consistency',
					`Found expected season format: ${this.testSeason} (all: ${allSeasons.join(', ')})`
				);
			} else {
				this.fail(
					'Season Consistency',
					`Expected season ${this.testSeason} not found. Available: ${allSeasons.join(', ')}`
				);
			}

			return hasCorrectSeason;
		} catch (error) {
			this.fail('Season Consistency', 'Failed to check season consistency', error as Error);
			return false;
		}
	}

	async testCompletedFixtures() {
		try {
			const completedFixtures = await this.db
				.select()
				.from(fixtures)
				.where(and(eq(fixtures.season, this.testSeason), eq(fixtures.status, 'FINISHED')));

			const withScores = completedFixtures.filter(
				(f: any) => f.homeScore !== null && f.awayScore !== null
			);

			this.success(
				'Completed Fixtures',
				`${completedFixtures.length} finished fixtures, ${withScores.length} with scores`
			);

			return completedFixtures.length;
		} catch (error) {
			this.fail('Completed Fixtures', 'Failed to check completed fixtures', error as Error);
			return 0;
		}
	}

	async testUserPredictionData() {
		try {
			// Get users with predictions
			const usersWithPredictions = await this.db
				.selectDistinct({ userId: predictions.userId })
				.from(predictions)
				.where(eq(predictions.organizationId, this.testOrgId));

			// Get predictions on completed fixtures
			const predictionsOnCompleted = await this.db
				.select()
				.from(predictions)
				.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
				.where(
					and(
						eq(predictions.organizationId, this.testOrgId),
						eq(fixtures.season, this.testSeason),
						eq(fixtures.status, 'FINISHED')
					)
				);

			this.success(
				'User Prediction Data',
				`${usersWithPredictions.length} users with predictions, ${predictionsOnCompleted.length} predictions on completed fixtures`
			);

			return {
				usersWithPredictions: usersWithPredictions.length,
				predictionsOnCompleted: predictionsOnCompleted.length
			};
		} catch (error) {
			this.fail('User Prediction Data', 'Failed to analyze prediction data', error as Error);
			return { usersWithPredictions: 0, predictionsOnCompleted: 0 };
		}
	}

	async testMetadataTable() {
		try {
			const metadata = await this.db
				.select()
				.from(leaderboardMeta)
				.where(
					and(
						eq(leaderboardMeta.organizationId, this.testOrgId),
						eq(leaderboardMeta.season, this.testSeason)
					)
				);

			if (metadata.length > 0) {
				const lastUpdate = new Date(metadata[0].lastLeaderboardUpdate);
				const isRecent = Date.now() - lastUpdate.getTime() < 24 * 60 * 60 * 1000; // 24 hours

				this.success(
					'Metadata Table',
					`Found metadata - last update: ${lastUpdate.toISOString()} (recent: ${isRecent})`
				);
			} else {
				this.fail('Metadata Table', 'No metadata found for test organization');
			}

			return metadata.length > 0;
		} catch (error) {
			this.fail('Metadata Table', 'Failed to check metadata table', error as Error);
			return false;
		}
	}

	// =================== DATA QUALITY TESTS ===================

	async testDataQuality() {
		try {
			// Check for null critical fields
			const fixturesWithoutTeams = await this.db
				.select()
				.from(fixtures)
				.where(
					and(
						eq(fixtures.season, this.testSeason),
						sql`(${fixtures.homeTeamId} IS NULL OR ${fixtures.awayTeamId} IS NULL)`
					)
				);

			// Check for predictions without scores on finished matches
			const predictionsNeedingScoring = await this.db
				.select()
				.from(predictions)
				.innerJoin(fixtures, eq(predictions.fixtureId, fixtures.id))
				.where(
					and(
						eq(predictions.organizationId, this.testOrgId),
						eq(fixtures.season, this.testSeason),
						eq(fixtures.status, 'FINISHED'),
						sql`(${fixtures.homeScore} IS NOT NULL AND ${fixtures.awayScore} IS NOT NULL)`,
						sql`${predictions.points} IS NULL`
					)
				);

			const qualityIssues = fixturesWithoutTeams.length + predictionsNeedingScoring.length;

			if (qualityIssues === 0) {
				this.success('Data Quality', 'All critical data fields populated correctly');
			} else {
				this.fail(
					'Data Quality',
					`${fixturesWithoutTeams.length} fixtures missing teams, ${predictionsNeedingScoring.length} predictions need scoring`
				);
			}

			return qualityIssues === 0;
		} catch (error) {
			this.fail('Data Quality', 'Failed to check data quality', error as Error);
			return false;
		}
	}

	// =================== ENVIRONMENT TESTS ===================

	async testEnvironmentVariables() {
		const requiredVars = [
			'DATABASE_URL',
			'FOOTBALL_DATA_API_KEY',
			'CLOUDFLARE_EMAIL',
			'CLOUDFLARE_KV_API_TOKEN',
			'CLOUDFLARE_KV_NAMESPACE_ID',
			'CLOUDFLARE_ACCOUNT_ID'
		];

		const missing = requiredVars.filter((varName) => !process.env[varName]);

		if (missing.length === 0) {
			this.success('Environment Variables', 'All required environment variables are set');
		} else {
			this.fail('Environment Variables', `Missing variables: ${missing.join(', ')}`);
		}

		return missing.length === 0;
	}

	// =================== SIMPLE API HEALTH CHECK ===================

	async testAPIHealthCheck() {
		if (typeof fetch === 'undefined') {
			this.fail('API Health Check', 'Fetch not available - skipping API tests');
			return false;
		}

		try {
			// Test if development server is running
			const response = await fetch('http://localhost:5173/', {
				method: 'HEAD',
				signal: AbortSignal.timeout(2000) // 2 second timeout
			});

			if (response.ok) {
				this.success('API Health Check', `Development server responding (${response.status})`);
				return true;
			} else {
				this.fail('API Health Check', `Server responded with ${response.status}`);
				return false;
			}
		} catch (error) {
			this.fail('API Health Check', 'Development server not running or not accessible');
			return false;
		}
	}

	// =================== MAIN TEST RUNNER ===================

	async runAllTests() {
		this.log('🚀', '='.repeat(60));
		this.log('🚀', 'MASTER LEAGUE SIMPLIFIED TEST SUITE');
		this.log('🚀', '='.repeat(60));

		// Phase 1: Environment & Infrastructure
		this.log('📋', 'Phase 1: Environment & Infrastructure');
		await this.runTest('Environment Variables', () => this.testEnvironmentVariables());
		await this.runTest('Database Connection', () => this.testDatabaseConnection());
		await this.runTest('API Health Check', () => this.testAPIHealthCheck());

		// Phase 2: Data Validation
		this.log('📋', 'Phase 2: Data Validation');
		await this.runTest('Season Consistency', () => this.testSeasonConsistency());
		await this.runTest('Fixture States', () => this.testFixtureStates());
		await this.runTest('Completed Fixtures', () => this.testCompletedFixtures());
		await this.runTest('Predictions Exist', () => this.testPredictionsExist());
		await this.runTest('User Prediction Data', () => this.testUserPredictionData());

		// Phase 3: System Health
		this.log('📋', 'Phase 3: System Health');
		await this.runTest('Metadata Table', () => this.testMetadataTable());
		await this.runTest('Data Quality', () => this.testDataQuality());

		// Results Summary
		this.showResults();
		return this.results.failed === 0;
	}

	showResults() {
		this.log('📊', '='.repeat(60));
		this.log('📊', 'TEST RESULTS SUMMARY');
		this.log('📊', '='.repeat(60));

		const total = this.results.passed + this.results.failed;
		const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : '0';

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

// Run the simplified test suite
const testSuite = new SimplifiedTestSuite();
testSuite.runAllTests().catch(console.error);
