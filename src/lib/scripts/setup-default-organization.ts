import { db } from '$lib/server/db';
import { organization, member } from '../server/db/auth/auth-schema';
import { user as authUser } from '../server/db/auth/auth-schema';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

async function setupDefaultOrganization() {
	console.log('🔧 Setting up default organization...');

	// Check if default organization already exists
	const existingOrg = await db
		.select()
		.from(organization)
		.where(eq(organization.slug, 'master-league'))
		.limit(1);

	let defaultOrg;
	if (existingOrg.length > 0) {
		defaultOrg = existingOrg[0];
		console.log('✅ Default organization already exists:', defaultOrg.name);
	} else {
		// Create a default organization
		defaultOrg = {
			id: randomUUID(),
			name: 'Master League',
			slug: 'master-league',
			logo: null,
			metadata: JSON.stringify({ isDefault: true }),
			createdAt: new Date(),
			updatedAt: new Date()
		};

		console.log('Creating organization:', defaultOrg.name);
		await db.insert(organization).values(defaultOrg);
		console.log('✅ Organization created');
	}

	// Get all users
	const users = await db.select().from(authUser);
	console.log(`Found ${users.length} users to add to organization`);

	// Add all users as members of the default organization
	const memberValues = users.map((user) => ({
		id: randomUUID(),
		userId: user.id,
		organizationId: defaultOrg.id,
		role: user.role === 'admin' ? 'owner' : 'member',
		createdAt: new Date() // Use Date object instead of string
	}));

	if (memberValues.length > 0) {
		console.log('Adding users as members...');
		await db.insert(member).values(memberValues);
	}

	console.log('✅ Default organization setup complete!');
	console.log(`   Organization: ${defaultOrg.name} (${defaultOrg.id})`);
	console.log(`   Members: ${memberValues.length}`);

	process.exit(0);
}

setupDefaultOrganization().catch((error) => {
	console.error('❌ Error:', error);
	process.exit(1);
});
