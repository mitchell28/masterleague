import { db } from '../server/db';
import { organization, member, authUser } from '../../../drizzle/schema';
import { randomUUID } from 'crypto';

async function setupDefaultOrganization() {
	console.log('🔧 Setting up default organization...');

	// Create a default organization
	const defaultOrg = {
		id: randomUUID(),
		name: 'Master League',
		slug: 'master-league',
		logo: null,
		metadata: JSON.stringify({ isDefault: true }),
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	console.log('Creating organization:', defaultOrg.name);
	await db.insert(organization).values(defaultOrg);

	// Get all users
	const users = await db.select().from(authUser);
	console.log(`Found ${users.length} users to add to organization`);

	// Add all users as members of the default organization
	const memberValues = users.map((user) => ({
		id: randomUUID(),
		userId: user.id,
		organizationId: defaultOrg.id,
		role: user.role === 'admin' ? 'owner' : 'member',
		createdAt: new Date().toISOString()
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
