import { seedAdminUser, applySchemaChanges } from './seed';

// This function will be called during server startup
export async function runMigrations() {
	// Apply schema changes first
	await applySchemaChanges();

	// Seed admin user
	await seedAdminUser();

	console.log('Migrations and seeding completed successfully');
}
