import * as dotenv from 'dotenv';
dotenv.config();
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('FOOTBALL_DATA_API_KEY exists:', !!process.env.FOOTBALL_DATA_API_KEY);
if (process.env.DATABASE_URL) {
	console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 20) + '...');
}
