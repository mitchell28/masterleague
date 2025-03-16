import pkg from 'pg';
import dotenv from 'dotenv';
const { Client } = pkg;

// Load environment variables
dotenv.config();

async function fixColumn() {
	const client = new Client({
		connectionString: process.env.DATABASE_URL
	});

	try {
		await client.connect();
		console.log('Connected to database');

		// Execute the ALTER TABLE statement
		await client.query(`
      ALTER TABLE league_table 
      ADD COLUMN IF NOT EXISTS predicted_fixtures INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS completed_fixtures INTEGER DEFAULT 0
    `);

		console.log('Successfully added missing columns');
	} catch (error) {
		console.error('Error executing query:', error);
	} finally {
		await client.end();
		console.log('Connection closed');
	}
}

// Run the script
fixColumn().catch(console.error);
