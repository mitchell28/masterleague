import { db, organization } from '../../src/lib/server/db/index.js';

async function getOrganizations() {
	try {
		console.log('Querying organizations...');
		const orgs = await db.select().from(organization).limit(5);
		console.log('Organizations found:', orgs);

		if (orgs.length > 0) {
			console.log('\nFirst organization ID:', orgs[0].id);
		} else {
			console.log('No organizations found in database');
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

getOrganizations();
