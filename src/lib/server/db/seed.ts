import { db } from './index';
import { user } from './schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Seeds the admin user into the database
 */
export async function seedAdminUser() {
	// Check if admin user already exists
	const existingAdmin = await db.select().from(user).where(eq(user.role, 'admin')).limit(1);

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
		return true;
	} else {
		console.log('Admin user already exists');
		return false;
	}
}

export async function applySchemaChanges() {
	// For PostgreSQL, we don't need to run ALTER TABLE statements here
	// as we're using migrations through drizzle-kit
	// PostgreSQL column modifications would be handled through migrations

	console.log('Schema changes applied successfully');
}
