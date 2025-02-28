// Database initialization script for Neon PostgreSQL
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Load environment variables
dotenv.config();

async function setupNeonDatabase() {
	try {
		const dbUrl = process.env.DATABASE_URL;
		if (!dbUrl) {
			throw new Error('DATABASE_URL environment variable is not set');
		}

		console.log('Connecting to Neon database...');

		// Test the connection
		const sql = neon(dbUrl);
		const testQuery = await sql`SELECT 1 as test`;
		console.log('Connection successful:', testQuery);

		// Check if admin user exists
		console.log('Checking for admin user...');
		const existingAdmin = await sql`SELECT * FROM "user" WHERE role = 'admin' LIMIT 1`;

		if (existingAdmin.length === 0) {
			console.log('Creating admin user...');

			const adminId = randomUUID();
			const passwordHash = await bcrypt.hash('admin123', 10);

			await sql`
				INSERT INTO "user" (id, username, password_hash, role)
				VALUES (${adminId}, 'admin', ${passwordHash}, 'admin')
			`;

			console.log('Admin user created successfully!');
		} else {
			console.log('Admin user already exists, no changes made');
		}

		console.log('✅ Database setup completed successfully');
	} catch (error) {
		console.error('❌ Database setup failed:', error);
		process.exit(1);
	}
}

// Run the setup
setupNeonDatabase();
