// Test CloudflareKV connection directly
console.log('Testing CloudflareKV availability...');

// Check environment variables
console.log('Environment check:');
console.log('CLOUDFLARE_ACCOUNT_ID:', process.env.CLOUDFLARE_ACCOUNT_ID ? 'Set' : 'Not set');
console.log('CLOUDFLARE_API_TOKEN:', process.env.CLOUDFLARE_API_TOKEN ? 'Set' : 'Not set');
console.log(
	'CLOUDFLARE_KV_NAMESPACE_ID:',
	process.env.CLOUDFLARE_KV_NAMESPACE_ID ? 'Set' : 'Not set'
);

const organizationId = '8290a405-bef2-48d0-8b44-e1defdd1ae07';
const season = '2025-26';

console.log('\nTesting cache key generation...');
const cacheKey = `leaderboard:${organizationId}:${season}`;
const metaKey = `leaderboard:meta:${organizationId}:${season}`;
console.log('Cache key:', cacheKey);
console.log('Meta key:', metaKey);
