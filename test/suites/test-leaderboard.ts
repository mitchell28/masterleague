import { getLeaderboard } from './src/lib/server/engine/analytics/leaderboard.js';

const organizationId = '8290a405-bef2-48d0-8b44-e1defdd1ae07';
const season = '2025-26';

console.log('Testing getLeaderboard function...');
console.log('Organization ID:', organizationId);
console.log('Season:', season);

try {
	const result = await getLeaderboard(organizationId, season);
	console.log('\nLeaderboard result:');
	console.log('Type:', typeof result);
	console.log('Is Array:', Array.isArray(result));
	console.log('Length:', result?.length);
	console.log('Data:', JSON.stringify(result, null, 2));
} catch (error) {
	console.error('Error calling getLeaderboard:', error);
}
