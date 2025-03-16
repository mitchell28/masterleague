import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures, predictions as predictionsTable, leagueTable } from '../server/db/schema';
import { user as authUser } from '../server/db/auth/auth-schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

// Constants
const NUM_FAKE_USERS = 10;
const POINTS_CORRECT_SCORE = 3;
const POINTS_CORRECT_OUTCOME = 1;

// Fake user names
const FAKE_FIRST_NAMES = [
	'John',
	'Jane',
	'Alex',
	'Sarah',
	'Michael',
	'Emma',
	'David',
	'Olivia',
	'James',
	'Sophia',
	'Robert',
	'Ava',
	'William',
	'Mia',
	'Thomas'
];

const FAKE_LAST_NAMES = [
	'Smith',
	'Johnson',
	'Williams',
	'Brown',
	'Jones',
	'Garcia',
	'Miller',
	'Davis',
	'Rodriguez',
	'Martinez',
	'Wilson',
	'Anderson',
	'Taylor',
	'Thomas',
	'Moore'
];

/**
 * Get a random integer between min and max (inclusive)
 */
function getRandomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random name
 */
function getRandomName(): string {
	const firstName = FAKE_FIRST_NAMES[getRandomInt(0, FAKE_FIRST_NAMES.length - 1)];
	const lastName = FAKE_LAST_NAMES[getRandomInt(0, FAKE_LAST_NAMES.length - 1)];
	return `${firstName} ${lastName}`;
}

/**
 * Generate a random email based on a name
 */
function getRandomEmail(name: string): string {
	const nameParts = name.toLowerCase().split(' ');
	const randomNumber = getRandomInt(100, 999);
	return `${nameParts[0]}.${nameParts[1]}${randomNumber}@example.com`;
}

/**
 * Create fake users
 */
async function createFakeUsers() {
	console.log(`🔄 Creating ${NUM_FAKE_USERS} fake users...`);

	const fakeUsers = [];

	for (let i = 0; i < NUM_FAKE_USERS; i++) {
		const name = getRandomName();
		const email = getRandomEmail(name);
		const now = new Date();

		const userId = randomUUID();

		const newUser = {
			id: userId,
			name,
			email,
			emailVerified: true,
			role: 'user',
			banned: false,
			createdAt: now,
			updatedAt: now
		};

		fakeUsers.push(newUser);
	}

	// Insert fake users
	await db.insert(authUser).values(fakeUsers);
	console.log(`✅ Created ${fakeUsers.length} fake users`);

	return fakeUsers;
}

/**
 * Create fake predictions for users
 */
async function createFakePredictions(users: any[]) {
	console.log('🔄 Creating fake predictions...');

	// Get all fixtures
	const allFixtures = await db.select().from(fixtures);
	console.log(`Found ${allFixtures.length} fixtures`);

	const userPredictions = [];

	for (const user of users) {
		console.log(`Creating predictions for user: ${user.name}`);

		for (const fixture of allFixtures) {
			// Skip some fixtures randomly to make it more realistic
			if (Math.random() > 0.8) continue;

			const predictedHomeScore = getRandomInt(0, 4);
			const predictedAwayScore = getRandomInt(0, 3);
			const now = new Date();

			// Calculate points if the fixture is completed
			let points = 0;
			if (
				fixture.status === 'completed' &&
				fixture.homeScore !== null &&
				fixture.awayScore !== null
			) {
				// Check for correct scoreline
				if (predictedHomeScore === fixture.homeScore && predictedAwayScore === fixture.awayScore) {
					points = POINTS_CORRECT_SCORE;
				}
				// Check for correct outcome
				else if (
					(predictedHomeScore > predictedAwayScore && fixture.homeScore > fixture.awayScore) ||
					(predictedHomeScore < predictedAwayScore && fixture.homeScore < fixture.awayScore) ||
					(predictedHomeScore === predictedAwayScore && fixture.homeScore === fixture.awayScore)
				) {
					points = POINTS_CORRECT_OUTCOME;
				}
			}

			userPredictions.push({
				id: randomUUID(),
				userId: user.id,
				fixtureId: fixture.id,
				predictedHomeScore,
				predictedAwayScore,
				points,
				createdAt: now
			});
		}
	}

	// Insert all predictions
	if (userPredictions.length > 0) {
		await db.insert(predictionsTable).values(userPredictions);
		console.log(`✅ Created ${userPredictions.length} fake predictions`);
	}
}

/**
 * Update the league table with the new predictions
 */
async function updateLeagueTable() {
	console.log('🔄 Updating league table with fake user data...');

	// Get all users
	const users = await db.select().from(authUser);

	for (const user of users) {
		// Get all predictions for this user that have points assigned
		const userPredictions = await db
			.select()
			.from(predictionsTable)
			.where(eq(predictionsTable.userId, user.id));

		// Calculate stats
		const totalPoints = userPredictions.reduce((sum, pred) => sum + (pred.points || 0), 0);

		// Count correct scorelines and outcomes
		let correctScorelines = 0;
		let correctOutcomes = 0;

		for (const prediction of userPredictions) {
			if (prediction.points === POINTS_CORRECT_SCORE) {
				correctScorelines++;
			} else if (prediction.points === POINTS_CORRECT_OUTCOME) {
				correctOutcomes++;
			}
		}

		const now = new Date();

		// Check if user already has an entry in the league table
		const existingEntry = await db
			.select()
			.from(leagueTable)
			.where(eq(leagueTable.userId, user.id))
			.then((res) => res[0]);

		if (!existingEntry) {
			// Create new entry
			await db.insert(leagueTable).values({
				id: randomUUID(),
				userId: user.id,
				totalPoints,
				correctScorelines,
				correctOutcomes,
				lastUpdated: now
			});
			console.log(`Created new league table entry for user ${user.email}`);
		} else {
			// Update existing entry
			await db
				.update(leagueTable)
				.set({
					totalPoints,
					correctScorelines,
					correctOutcomes,
					lastUpdated: now
				})
				.where(eq(leagueTable.id, existingEntry.id));
			console.log(`Updated league table entry for user ${user.email}`);
		}
	}

	console.log('✅ League table updated successfully');
}

/**
 * Main function to seed fake users and predictions
 */
async function seedFakeData() {
	try {
		console.log('🚀 Starting fake data seeding process...');

		// Create fake users
		const fakeUsers = await createFakeUsers();

		// Create fake predictions
		await createFakePredictions(fakeUsers);

		// Update league table
		await updateLeagueTable();

		console.log('✅ Successfully seeded fake users and predictions');
	} catch (error) {
		console.error('❌ Failed to seed fake data:', error);
		process.exit(1);
	}
}

// Run the seed function
seedFakeData().catch(console.error);
