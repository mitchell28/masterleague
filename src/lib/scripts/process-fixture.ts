import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures, predictions, user } from '../server/db/schema';
import { eq, and } from 'drizzle-orm';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

// Points for correct predictions
const POINTS_CORRECT_SCORE = 3;
const POINTS_CORRECT_OUTCOME = 1;

// Define outcome types
type PredictionOutcome = 'correct_score' | 'correct_outcome' | 'incorrect';

/**
 * Script to process fixture results and calculate points
 */
async function processFixture() {
	console.log('🔄 Processing fixture results...');

	try {
		// Get fixture ID from command line arguments
		const fixtureId = process.argv[2];

		if (!fixtureId) {
			console.error('❌ Fixture ID is required');
			console.log('Usage: npm run process-fixture <fixtureId>');
			process.exit(1);
		}

		// Get the fixture
		const fixture = await db
			.select()
			.from(fixtures)
			.where(eq(fixtures.id, fixtureId))
			.then((res) => res[0]);

		if (!fixture) {
			throw new Error(`Fixture not found: ${fixtureId}`);
		}

		if (fixture.status !== 'completed') {
			throw new Error(`Fixture ${fixtureId} is not completed (status: ${fixture.status})`);
		}

		if (fixture.homeScore === null || fixture.awayScore === null) {
			throw new Error(`Fixture ${fixtureId} does not have scores set`);
		}

		// Get all predictions for this fixture
		const allPredictions = await db
			.select()
			.from(predictions)
			.where(eq(predictions.fixtureId, fixtureId));

		console.log(`Processing ${allPredictions.length} predictions for fixture ${fixtureId}`);

		// Process each prediction
		for (const prediction of allPredictions) {
			let points = 0;

			// Check for correct scoreline
			if (
				prediction.predictedHomeScore === fixture.homeScore &&
				prediction.predictedAwayScore === fixture.awayScore
			) {
				points = POINTS_CORRECT_SCORE;
			}
			// Check for correct outcome
			else if (
				(prediction.predictedHomeScore > prediction.predictedAwayScore &&
					fixture.homeScore > fixture.awayScore) ||
				(prediction.predictedHomeScore < prediction.predictedAwayScore &&
					fixture.homeScore < fixture.awayScore) ||
				(prediction.predictedHomeScore === prediction.predictedAwayScore &&
					fixture.homeScore === fixture.awayScore)
			) {
				points = POINTS_CORRECT_OUTCOME;
			}

			// Update the prediction with points
			await db
				.update(predictions)
				.set({
					points
				})
				.where(eq(predictions.id, prediction.id));
		}

		console.log(`✅ Fixture results processed successfully for fixture ${fixtureId}`);
	} catch (error) {
		console.error('❌ Failed to process fixture results:', error);
		process.exit(1);
	}
}

// Run the process function
processFixture().catch(console.error);
