import * as dotenv from 'dotenv';
dotenv.config();

// Test the database connection
try {
	console.log('Testing database connection...');
	console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

	// Import our database connection
	const { db } = await import('./src/lib/server/db/index.ts');
	console.log('✅ Database connection imported successfully');

	// Try a simple query
	const result = await db.execute('SELECT 1 as test');
	console.log('✅ Database query successful:', result);
} catch (error) {
	console.error('❌ Database connection failed:', error.message);
}
