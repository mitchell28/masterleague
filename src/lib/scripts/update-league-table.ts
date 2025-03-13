import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { predictions, leagueTable, user } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

/**
 * Script to update the league table based on all processed predictions
 */
async function updateLeagueTable() {
	console.log('🔄 Updating league table...');

	try {
		// Get all users
		const users = await db.select().from(user);
		console.log(`Found ${users.length} users to update in the league table`);

		for (const user of users) {
			// Get all predictions for this user that have points assigned
			const userPredictions = await db
				.select()
				.from(predictions)
				.where(eq(predictions.userId, user.id));

			// Calculate stats
			const totalPoints = userPredictions.reduce((sum, pred) => sum + (pred.points || 0), 0);

			// Count correct scorelines and outcomes
			let correctScorelines = 0;
			let correctOutcomes = 0;

			for (const prediction of userPredictions) {
				if (prediction.points === 3) {
					correctScorelines++;
				} else if (prediction.points === 1) {
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

		// Display current league table
		const currentTable = await db
			.select({
				userId: leagueTable.userId,
				username: user.email,
				totalPoints: leagueTable.totalPoints,
				correctScorelines: leagueTable.correctScorelines,
				correctOutcomes: leagueTable.correctOutcomes
			})
			.from(leagueTable)
			.innerJoin(user, eq(leagueTable.userId, user.id))
			.orderBy(desc(leagueTable.totalPoints));

		console.log('\nCurrent League Table:');
		console.log('--------------------');
		console.log('Rank | Username | Points | Correct Scores | Correct Outcomes');
		console.log('--------------------');

		currentTable.forEach((entry, index) => {
			console.log(
				`${index + 1}    | ${entry.username.padEnd(8)} | ${entry.totalPoints.toString().padEnd(6)} | ${entry.correctScorelines.toString().padEnd(14)} | ${entry.correctOutcomes}`
			);
		});
	} catch (error) {
		console.error('❌ Failed to update league table:', error);
		process.exit(1);
	}
}

// Run the update function
updateLeagueTable().catch(console.error);
