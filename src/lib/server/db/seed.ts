import { db } from './index';
import { user } from './schema';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

export async function seedAdminUser() {
	// Check if admin user already exists
	const existingAdmin = await db
		.select()
		.from(user)
		.where(sql`${user.role} = 'admin'`)
		.limit(1);

	if (existingAdmin.length === 0) {
		// Create admin user
		const adminId = randomUUID();
		const adminPassword = 'admin123'; // You should change this in production
		const passwordHash = await bcrypt.hash(adminPassword, 10);

		await db.insert(user).values({
			id: adminId,
			username: 'admin',
			passwordHash,
			role: 'admin'
		});

		console.log('Admin user created successfully');
	} else {
		console.log('Admin user already exists');
	}
}

export async function applySchemaChanges() {
	// Add role column if it doesn't exist
	try {
		await db.run(sql`ALTER TABLE user ADD COLUMN role text DEFAULT 'user' NOT NULL`);
		console.log('Added role column to user table');
	} catch (error) {
		console.log('Role column might already exist:', error);
	}

	console.log('Schema changes applied successfully');
}
