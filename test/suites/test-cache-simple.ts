/**
 * Cache Testing Suite - Simplified
 * Test CloudflareKV basic operations without full SvelteKit deps
 */

import 'dotenv/config';

class SimpleCacheTest {
	private baseUrl = 'http://localhost:5173';
	private orgId = '8290a405-bef2-48d0-8b44-e1defdd1ae07';
	private season = '2025';

	async log(emoji: string, message: string) {
		console.log(`${emoji} [${new Date().toISOString()}] ${message}`);
	}

	async testLeaderboardAPI() {
		this.log('🧪', 'Testing leaderboard API cache behavior');

		try {
			// Test 1: First call (should calculate or hit cache)
			const start1 = Date.now();
			const response1 = await fetch(
				`${this.baseUrl}/api/leaderboard?organizationId=${this.orgId}&season=${this.season}`
			);
			const data1 = await response1.json();
			const time1 = Date.now() - start1;

			if (data1.success) {
				this.log(
					'✅',
					`First call: ${data1.data?.length || 0} users, ${time1}ms (cache: ${data1.fromCache || 'unknown'})`
				);
			} else {
				this.log('❌', `First call failed: ${data1.message}`);
			}

			// Test 2: Second call (should hit cache)
			await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
			const start2 = Date.now();
			const response2 = await fetch(
				`${this.baseUrl}/api/leaderboard?organizationId=${this.orgId}&season=${this.season}`
			);
			const data2 = await response2.json();
			const time2 = Date.now() - start2;

			if (data2.success) {
				this.log(
					'✅',
					`Second call: ${data2.data?.length || 0} users, ${time2}ms (cache: ${data2.fromCache || 'unknown'})`
				);

				if (time2 < time1) {
					this.log('🚀', `Cache speedup: ${time1 - time2}ms faster`);
				}
			} else {
				this.log('❌', `Second call failed: ${data2.message}`);
			}

			return { success: true, firstCall: time1, secondCall: time2 };
		} catch (error: any) {
			this.log('❌', `API test failed: ${error.message}`);
			return { success: false, error: error.message };
		}
	}

	async testCacheInvalidation() {
		this.log('🧪', 'Testing cache invalidation through background API');

		try {
			// Force refresh (should invalidate cache)
			const refreshResponse = await fetch(`${this.baseUrl}/api/background`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'refresh-leaderboard',
					organizationId: this.orgId,
					season: this.season
				})
			});

			const refreshData = await refreshResponse.json();

			if (refreshData.success) {
				this.log(
					'✅',
					`Cache invalidation: ${refreshData.result?.usersUpdated || 0} users updated`
				);
			} else {
				this.log('❌', `Cache invalidation failed: ${refreshData.message}`);
			}

			// Test call after invalidation (should be fresh)
			await new Promise((resolve) => setTimeout(resolve, 100));
			const start = Date.now();
			const response = await fetch(
				`${this.baseUrl}/api/leaderboard?organizationId=${this.orgId}&season=${this.season}`
			);
			const data = await response.json();
			const time = Date.now() - start;

			if (data.success) {
				this.log('✅', `Post-invalidation call: ${time}ms (cache: ${data.fromCache || 'unknown'})`);
			} else {
				this.log('❌', `Post-invalidation call failed: ${data.message}`);
			}

			return { success: true };
		} catch (error: any) {
			this.log('❌', `Cache invalidation test failed: ${error.message}`);
			return { success: false, error: error.message };
		}
	}

	async testConcurrentRequests() {
		this.log('🧪', 'Testing concurrent leaderboard requests');

		try {
			const concurrentRequests = 5;
			const promises = [];

			for (let i = 0; i < concurrentRequests; i++) {
				promises.push(
					fetch(
						`${this.baseUrl}/api/leaderboard?organizationId=${this.orgId}&season=${this.season}`
					)
						.then((res) => res.json())
						.then((data) => ({
							success: data.success,
							fromCache: data.fromCache,
							users: data.data?.length || 0,
							index: i
						}))
				);
			}

			const start = Date.now();
			const results = await Promise.all(promises);
			const totalTime = Date.now() - start;

			const successful = results.filter((r) => r.success).length;
			const fromCache = results.filter((r) => r.fromCache).length;

			this.log(
				'✅',
				`Concurrent requests: ${successful}/${concurrentRequests} successful, ${fromCache} from cache, ${totalTime}ms total`
			);

			return { success: true, results };
		} catch (error: any) {
			this.log('❌', `Concurrent test failed: ${error.message}`);
			return { success: false, error: error.message };
		}
	}

	async runAllCacheTests() {
		this.log('🚀', '='.repeat(50));
		this.log('🚀', 'CACHE PERFORMANCE TEST SUITE');
		this.log('🚀', '='.repeat(50));

		await this.testLeaderboardAPI();
		await new Promise((resolve) => setTimeout(resolve, 500));

		await this.testCacheInvalidation();
		await new Promise((resolve) => setTimeout(resolve, 500));

		await this.testConcurrentRequests();

		this.log('🎯', 'Cache testing complete!');
	}
}

// Run cache tests
const cacheTest = new SimpleCacheTest();
cacheTest.runAllCacheTests().catch(console.error);
