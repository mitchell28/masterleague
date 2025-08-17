/**
 * Cache Testing Suite
 * Test CloudflareKV performance, fallbacks, and edge cases
 */

import { LeaderboardCache } from '../src/lib/server/cache/leaderboard-cache.ts';
import { db } from '../src/lib/server/db/index.ts';
import { leaderboardMeta } from '../src/lib/server/db/schema.ts';
import { eq, and } from 'drizzle-orm';

export class CacheTestSuite {
  constructor(organizationId = '8290a405-bef2-48d0-8b44-e1defdd1ae07', season = '2025-26') {
    this.organizationId = organizationId;
    this.season = season;
    this.testResults = [];
  }

  log(emoji, message) {
    console.log(`${emoji} [${new Date().toISOString()}] ${message}`);
  }

  recordResult(test, success, message, timing = null) {
    const result = {
      test,
      success,
      message,
      timing,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    
    if (success) {
      this.log('✅', `${test}: ${message}${timing ? ` (${timing}ms)` : ''}`);
    } else {
      this.log('❌', `${test}: ${message}`);
    }
  }

  // =================== BASIC CACHE OPERATIONS ===================

  async testBasicCacheOperations() {
    this.log('🧪', 'Testing basic cache operations');

    // Test 1: Write operation
    const testData = [
      { userId: 'test-user-1', points: 100, rank: 1 },
      { userId: 'test-user-2', points: 90, rank: 2 },
      { userId: 'test-user-3', points: 80, rank: 3 }
    ];

    try {
      const writeStart = Date.now();
      await LeaderboardCache.set(this.organizationId, this.season, testData);
      const writeTime = Date.now() - writeStart;
      
      this.recordResult('Cache Write', true, 'Successfully wrote test data', writeTime);
    } catch (error) {
      this.recordResult('Cache Write', false, `Write failed: ${error.message}`);
      return false;
    }

    // Test 2: Read operation
    try {
      const readStart = Date.now();
      const cachedData = await LeaderboardCache.get(this.organizationId, this.season);
      const readTime = Date.now() - readStart;

      if (cachedData && cachedData.data.length === 3) {
        this.recordResult('Cache Read', true, `Read ${cachedData.data.length} items`, readTime);
      } else {
        this.recordResult('Cache Read', false, 'Data mismatch or empty response');
        return false;
      }
    } catch (error) {
      this.recordResult('Cache Read', false, `Read failed: ${error.message}`);
      return false;
    }

    return true;
  }

  async testMetadataOperations() {
    this.log('🧪', 'Testing metadata operations');

    const testMeta = {
      lastLeaderboardUpdate: new Date().toISOString(),
      totalUsers: 150,
      lastCalculationDuration: 1250
    };

    // Test metadata write
    try {
      const writeStart = Date.now();
      await LeaderboardCache.setMeta(this.organizationId, this.season, testMeta);
      const writeTime = Date.now() - writeStart;
      
      this.recordResult('Metadata Write', true, 'Successfully wrote metadata', writeTime);
    } catch (error) {
      this.recordResult('Metadata Write', false, `Write failed: ${error.message}`);
      return false;
    }

    // Test metadata read
    try {
      const readStart = Date.now();
      const cachedMeta = await LeaderboardCache.getMeta(this.organizationId, this.season);
      const readTime = Date.now() - readStart;

      if (cachedMeta && cachedMeta.totalUsers === 150) {
        this.recordResult('Metadata Read', true, 'Successfully read metadata', readTime);
      } else {
        this.recordResult('Metadata Read', false, 'Metadata mismatch');
        return false;
      }
    } catch (error) {
      this.recordResult('Metadata Read', false, `Read failed: ${error.message}`);
      return false;
    }

    return true;
  }

  // =================== PERFORMANCE TESTS ===================

  async testCachePerformance() {
    this.log('🧪', 'Testing cache performance with various data sizes');

    const dataSizes = [10, 100, 500, 1000];
    
    for (const size of dataSizes) {
      const testData = Array.from({ length: size }, (_, i) => ({
        userId: `user-${i}`,
        points: Math.floor(Math.random() * 1000),
        rank: i + 1
      }));

      // Write performance
      try {
        const writeStart = Date.now();
        await LeaderboardCache.set(this.organizationId, this.season, testData);
        const writeTime = Date.now() - writeStart;
        
        this.recordResult(`Performance Write (${size} items)`, true, 
          `${(size / writeTime * 1000).toFixed(0)} items/sec`, writeTime);
      } catch (error) {
        this.recordResult(`Performance Write (${size} items)`, false, 
          `Failed: ${error.message}`);
        continue;
      }

      // Read performance
      try {
        const readStart = Date.now();
        const result = await LeaderboardCache.get(this.organizationId, this.season);
        const readTime = Date.now() - readStart;
        
        if (result && result.data.length === size) {
          this.recordResult(`Performance Read (${size} items)`, true, 
            `${(size / readTime * 1000).toFixed(0)} items/sec`, readTime);
        } else {
          this.recordResult(`Performance Read (${size} items)`, false, 
            'Data size mismatch');
        }
      } catch (error) {
        this.recordResult(`Performance Read (${size} items)`, false, 
          `Failed: ${error.message}`);
      }

      // Small delay between tests
      await this.sleep(100);
    }
  }

  // =================== TTL AND EXPIRATION TESTS ===================

  async testTTLBehavior() {
    this.log('🧪', 'Testing TTL and expiration behavior');

    const shortTtlData = [{ userId: 'ttl-test', points: 999, rank: 1 }];
    
    // Set data with very short TTL (for testing purposes)
    try {
      await LeaderboardCache.set(this.organizationId, this.season, shortTtlData, 2); // 2 seconds
      this.recordResult('TTL Set', true, 'Set data with 2-second TTL');
    } catch (error) {
      this.recordResult('TTL Set', false, `Failed: ${error.message}`);
      return false;
    }

    // Immediate read (should work)
    try {
      const immediateResult = await LeaderboardCache.get(this.organizationId, this.season);
      if (immediateResult && immediateResult.data.length > 0) {
        this.recordResult('TTL Immediate Read', true, 'Data available immediately');
      } else {
        this.recordResult('TTL Immediate Read', false, 'Data not available');
      }
    } catch (error) {
      this.recordResult('TTL Immediate Read', false, `Failed: ${error.message}`);
    }

    // Wait for expiration
    this.log('⏱️', 'Waiting for TTL expiration...');
    await this.sleep(3000);

    // Read after expiration (should fail or return null)
    try {
      const expiredResult = await LeaderboardCache.get(this.organizationId, this.season);
      if (!expiredResult || expiredResult.data.length === 0) {
        this.recordResult('TTL Expiration', true, 'Data properly expired');
      } else {
        this.recordResult('TTL Expiration', false, 'Data still available after expiration');
      }
    } catch (error) {
      this.recordResult('TTL Expiration', true, 'Cache miss after expiration (expected)');
    }
  }

  // =================== CONCURRENT ACCESS TESTS ===================

  async testConcurrentOperations() {
    this.log('🧪', 'Testing concurrent cache operations');

    const promises = [];
    const testSessions = 5;

    // Create multiple concurrent write operations
    for (let i = 0; i < testSessions; i++) {
      const testData = Array.from({ length: 50 }, (_, j) => ({
        userId: `concurrent-user-${i}-${j}`,
        points: Math.floor(Math.random() * 1000),
        rank: j + 1
      }));

      promises.push(
        LeaderboardCache.set(`${this.organizationId}-test-${i}`, this.season, testData)
      );
    }

    try {
      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;
      
      this.recordResult('Concurrent Writes', true, 
        `${testSessions} concurrent writes completed`, duration);
    } catch (error) {
      this.recordResult('Concurrent Writes', false, `Failed: ${error.message}`);
    }

    // Test concurrent reads
    const readPromises = [];
    for (let i = 0; i < testSessions; i++) {
      readPromises.push(
        LeaderboardCache.get(`${this.organizationId}-test-${i}`, this.season)
      );
    }

    try {
      const start = Date.now();
      const results = await Promise.all(readPromises);
      const duration = Date.now() - start;
      
      const successCount = results.filter(r => r && r.data.length > 0).length;
      this.recordResult('Concurrent Reads', true, 
        `${successCount}/${testSessions} concurrent reads successful`, duration);
    } catch (error) {
      this.recordResult('Concurrent Reads', false, `Failed: ${error.message}`);
    }
  }

  // =================== DATABASE SYNC TESTS ===================

  async testDatabaseSync() {
    this.log('🧪', 'Testing cache-database synchronization');

    const testMeta = {
      lastLeaderboardUpdate: new Date().toISOString(),
      totalUsers: 777,
      lastCalculationDuration: 1500
    };

    // 1. Set in cache
    try {
      await LeaderboardCache.setMeta(this.organizationId, this.season, testMeta);
      this.recordResult('DB Sync - Cache Set', true, 'Metadata set in cache');
    } catch (error) {
      this.recordResult('DB Sync - Cache Set', false, `Failed: ${error.message}`);
      return false;
    }

    // 2. Check if it synced to database (leaderboard implementation should handle this)
    await this.sleep(1000); // Give time for sync

    try {
      const dbMeta = await db
        .select()
        .from(leaderboardMeta)
        .where(and(
          eq(leaderboardMeta.organizationId, this.organizationId),
          eq(leaderboardMeta.season, this.season)
        ));

      if (dbMeta.length > 0 && dbMeta[0].totalUsers === 777) {
        this.recordResult('DB Sync - Database Check', true, 'Metadata synced to database');
      } else {
        this.recordResult('DB Sync - Database Check', false, 
          `Database sync failed or incomplete: ${dbMeta.length} records`);
      }
    } catch (error) {
      this.recordResult('DB Sync - Database Check', false, `Failed: ${error.message}`);
    }
  }

  // =================== ERROR HANDLING TESTS ===================

  async testErrorHandling() {
    this.log('🧪', 'Testing error handling and edge cases');

    // Test 1: Invalid organization ID
    try {
      await LeaderboardCache.get('invalid-org-id', this.season);
      this.recordResult('Error Handling - Invalid Org', true, 'Handled invalid org ID gracefully');
    } catch (error) {
      this.recordResult('Error Handling - Invalid Org', false, `Unexpected error: ${error.message}`);
    }

    // Test 2: Empty data write
    try {
      await LeaderboardCache.set(this.organizationId, this.season, []);
      this.recordResult('Error Handling - Empty Data', true, 'Handled empty data write');
    } catch (error) {
      this.recordResult('Error Handling - Empty Data', false, `Failed: ${error.message}`);
    }

    // Test 3: Very large data (test limits)
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      userId: `large-test-user-${i}`,
      points: Math.floor(Math.random() * 10000),
      rank: i + 1,
      extraData: 'x'.repeat(100) // Add some bulk
    }));

    try {
      const start = Date.now();
      await LeaderboardCache.set(this.organizationId, this.season, largeData);
      const duration = Date.now() - start;
      
      this.recordResult('Error Handling - Large Data', true, 
        `Handled large dataset (10k items)`, duration);
    } catch (error) {
      this.recordResult('Error Handling - Large Data', false, 
        `Failed with large dataset: ${error.message}`);
    }
  }

  // =================== CLEANUP TESTS ===================

  async testCacheInvalidation() {
    this.log('🧪', 'Testing cache invalidation and cleanup');

    // Set test data
    const testData = [{ userId: 'cleanup-test', points: 123, rank: 1 }];
    
    try {
      await LeaderboardCache.set(this.organizationId, this.season, testData);
      this.recordResult('Cleanup - Set Data', true, 'Test data set');
    } catch (error) {
      this.recordResult('Cleanup - Set Data', false, `Failed: ${error.message}`);
      return false;
    }

    // Verify data exists
    try {
      const result = await LeaderboardCache.get(this.organizationId, this.season);
      if (result && result.data.length > 0) {
        this.recordResult('Cleanup - Verify Data', true, 'Data confirmed present');
      } else {
        this.recordResult('Cleanup - Verify Data', false, 'Data not found');
      }
    } catch (error) {
      this.recordResult('Cleanup - Verify Data', false, `Failed: ${error.message}`);
    }

    // Invalidate cache
    try {
      await LeaderboardCache.invalidate(this.organizationId, this.season);
      this.recordResult('Cleanup - Invalidate', true, 'Cache invalidated');
    } catch (error) {
      this.recordResult('Cleanup - Invalidate', false, `Failed: ${error.message}`);
      return false;
    }

    // Verify data is gone
    try {
      const result = await LeaderboardCache.get(this.organizationId, this.season);
      if (!result || result.data.length === 0) {
        this.recordResult('Cleanup - Verify Removal', true, 'Data properly removed');
      } else {
        this.recordResult('Cleanup - Verify Removal', false, 'Data still present after invalidation');
      }
    } catch (error) {
      this.recordResult('Cleanup - Verify Removal', true, 'Cache miss after invalidation (expected)');
    }
  }

  // =================== MAIN TEST RUNNER ===================

  async runAllCacheTests() {
    this.log('🚀', '='.repeat(60));
    this.log('🚀', 'CLOUDFLARE KV CACHE TEST SUITE');
    this.log('🚀', '='.repeat(60));

    await this.testBasicCacheOperations();
    await this.testMetadataOperations();
    await this.testCachePerformance();
    await this.testTTLBehavior();
    await this.testConcurrentOperations();
    await this.testDatabaseSync();
    await this.testErrorHandling();
    await this.testCacheInvalidation();

    this.showCacheResults();
  }

  showCacheResults() {
    this.log('📊', '='.repeat(60));
    this.log('📊', 'CACHE TEST RESULTS');
    this.log('📊', '='.repeat(60));

    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const total = this.testResults.length;
    
    this.log('✅', `Passed: ${passed}`);
    this.log('❌', `Failed: ${failed}`);
    this.log('📈', `Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    // Performance summary
    const performanceTests = this.testResults.filter(r => r.timing && r.success);
    if (performanceTests.length > 0) {
      const avgTiming = performanceTests.reduce((sum, r) => sum + r.timing, 0) / performanceTests.length;
      this.log('⚡', `Average Response Time: ${avgTiming.toFixed(0)}ms`);
    }

    // Failed tests
    const failedTests = this.testResults.filter(r => !r.success);
    if (failedTests.length > 0) {
      this.log('🔍', 'Failed Tests:');
      failedTests.forEach(t => this.log('  ❌', `${t.test}: ${t.message}`));
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
if (import.meta.main) {
  const cacheTests = new CacheTestSuite();
  await cacheTests.runAllCacheTests();
}
