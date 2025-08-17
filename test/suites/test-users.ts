import { db, authUser } from './src/lib/server/db/index.js';

async function getUsers() {
	try {
		console.log('Querying users...');
		const users = await db.select().from(authUser).limit(5);
		console.log('Users found:', users.length);
		for (const user of users) {
			console.log(
				`- ID: ${user.id}, Email: ${user.email}, Name: ${user.name || 'No name'}, Email verified: ${user.emailVerified}`
			);
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

getUsers();
