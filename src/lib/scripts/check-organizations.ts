import { db } from '../server/db';
import { organization, member, authUser } from '../../../drizzle/schema';

async function checkOrganizations() {
	console.log('🔍 Checking organizations...');

	// Check all organizations
	const organizations = await db.select().from(organization);
	console.log('Organizations:', organizations);

	// Check all members
	const members = await db.select().from(member);
	console.log('Members:', members);

	// Check all users
	const users = await db.select().from(authUser);
	console.log('Users:', users);

	console.log('✅ Done');
	process.exit(0);
}

checkOrganizations().catch((error) => {
	console.error('❌ Error:', error);
	process.exit(1);
});
