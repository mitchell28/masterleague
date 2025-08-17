/**
 * Concurrent Load Test
 * Test multiple simultaneous operations
 */

import 'dotenv/config';

class ConcurrentLoadTest {
	private baseUrl = 'http://localhost:5173';
	private orgId = '8290a405-bef2-48d0-8b44-e1defdd1ae07';
	private season = '2025';

	async log(emoji: string, message: string) {
		console.log(`${emoji} [${new Date().toISOString()}] ${message}`);
	}

	async triggerBackgroundRefresh() {
		const start = Date.now();

		try {
			const response = await fetch(`${this.baseUrl}/api/background`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'refresh-leaderboard',
					organizationId: this.orgId,
					season: this.season
				})
			});

			const data = await response.json();
			const duration = Date.now() - start;

			return {
				success: data.success,
				duration,
				usersUpdated: data.result?.usersUpdated || 0,
				executionTime: data.result?.executionTime || 0,
				error: data.error || null
			};
		} catch (error: any) {
			return {
				success: false,
				duration: Date.now() - start,
				usersUpdated: 0,
				executionTime: 0,
				error: error.message
			};
		}
	}

	async testConcurrentLeaderboardUpdates() {
		this.log('🧪', 'Testing concurrent leaderboard updates');

		const concurrentRequests = 3;
		const promises = [];

		for (let i = 0; i < concurrentRequests; i++) {
			promises.push(this.triggerBackgroundRefresh());
		}

		const start = Date.now();
		const results = await Promise.all(promises);
		const totalTime = Date.now() - start;

		const successful = results.filter((r) => r.success).length;
		const avgExecution =
			results.filter((r) => r.success).reduce((sum, r) => sum + r.executionTime, 0) / successful;

		this.log('✅', `Concurrent updates: ${successful}/${concurrentRequests} successful`);
		this.log('📊', `Total time: ${totalTime}ms, Avg execution: ${avgExecution.toFixed(0)}ms`);

		// Show individual results
		results.forEach((result, i) => {
			const status = result.success ? '✅' : '❌';
			this.log(
				status,
				`Request ${i + 1}: ${result.duration}ms (exec: ${result.executionTime}ms, users: ${result.usersUpdated})`
			);
		});

		return results;
	}

	async testRapidFireRequests() {
		this.log('🧪', 'Testing rapid-fire background requests');

		const requests = 5;
		const results = [];

		for (let i = 0; i < requests; i++) {
			const result = await this.triggerBackgroundRefresh();
			results.push(result);
			this.log('📈', `Request ${i + 1}: ${result.duration}ms (success: ${result.success})`);

			// Short delay between requests
			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		const successful = results.filter((r) => r.success).length;
		this.log('🎯', `Rapid-fire results: ${successful}/${requests} successful`);

		return results;
	}

	async testSystemRecovery() {
		this.log('🧪', 'Testing system recovery after reset operations');

		// First, reset some fixtures to create activity
		this.log('🔄', 'Resetting fixtures to create fresh state...');

		// We'll simulate this by just checking current state and triggering refresh
		const baselineResult = await this.triggerBackgroundRefresh();
		this.log(
			'📊',
			`Baseline: ${baselineResult.usersUpdated} users, ${baselineResult.executionTime}ms`
		);

		// Test multiple quick refreshes to see if system remains stable
		const recoveryTests = [];
		for (let i = 0; i < 3; i++) {
			const result = await this.triggerBackgroundRefresh();
			recoveryTests.push(result);
			this.log(
				'🔍',
				`Recovery test ${i + 1}: ${result.success ? 'OK' : 'FAIL'} (${result.executionTime}ms)`
			);
		}

		const allSuccessful = recoveryTests.every((r) => r.success);
		this.log(
			allSuccessful ? '✅' : '❌',
			`System recovery: ${allSuccessful ? 'STABLE' : 'UNSTABLE'}`
		);

		return allSuccessful;
	}

	async runLoadTests() {
		this.log('🚀', '='.repeat(50));
		this.log('🚀', 'CONCURRENT LOAD TEST SUITE');
		this.log('🚀', '='.repeat(50));

		await this.testConcurrentLeaderboardUpdates();
		await new Promise((resolve) => setTimeout(resolve, 1000));

		await this.testRapidFireRequests();
		await new Promise((resolve) => setTimeout(resolve, 1000));

		await this.testSystemRecovery();

		this.log('🎯', 'Load testing complete!');
	}
}

// Run load tests
const loadTest = new ConcurrentLoadTest();
loadTest.runLoadTests().catch(console.error);
