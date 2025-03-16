import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures, predictions as predictionsTable, teams } from '../server/db/schema';
import { user as authUser } from '../server/db/auth/auth-schema';
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

/**
 * Script to check detailed prediction information for a specific user
 */
async function userPredictionReport() {
	try {
		// Get user ID or email from command line arguments
		const userIdentifier = process.argv[2];

		if (!userIdentifier) {
			console.error('❌ User ID or email is required');
			console.log('Usage: npm run db:user-prediction-report <userId or email>');
			process.exit(1);
		}

		// Try to find user by ID or email
		let user;
		if (userIdentifier.includes('@')) {
			// Find by email
			user = await db
				.select()
				.from(authUser)
				.where(eq(authUser.email, userIdentifier))
				.then((res) => res[0]);
		} else {
			// Find by ID
			user = await db
				.select()
				.from(authUser)
				.where(eq(authUser.id, userIdentifier))
				.then((res) => res[0]);
		}

		if (!user) {
			console.error(`❌ User not found with identifier: ${userIdentifier}`);
			process.exit(1);
		}

		console.log(`🔍 Generating prediction report for user: ${user.name} (${user.email})`);

		// Get all predictions for this user with fixture details
		const userPredictions = await db
			.select({
				prediction: {
					id: predictionsTable.id,
					predictedHomeScore: predictionsTable.predictedHomeScore,
					predictedAwayScore: predictionsTable.predictedAwayScore,
					points: predictionsTable.points,
					createdAt: predictionsTable.createdAt
				},
				fixture: {
					id: fixtures.id,
					weekId: fixtures.weekId,
					homeScore: fixtures.homeScore,
					awayScore: fixtures.awayScore,
					matchDate: fixtures.matchDate,
					status: fixtures.status,
					pointsMultiplier: fixtures.pointsMultiplier
				},
				homeTeam: {
					id: teams.id,
					name: teams.name,
					shortName: teams.shortName
				}
			})
			.from(predictionsTable)
			.innerJoin(fixtures, eq(predictionsTable.fixtureId, fixtures.id))
			.innerJoin(teams, eq(fixtures.homeTeamId, teams.id))
			.where(eq(predictionsTable.userId, user.id))
			.orderBy(fixtures.matchDate);

		// Get away team names in a separate query
		const awayTeamInfo = new Map();

		for (const prediction of userPredictions) {
			const fixture = await db
				.select({
					fixtureId: fixtures.id,
					awayTeam: {
						id: teams.id,
						name: teams.name,
						shortName: teams.shortName
					}
				})
				.from(fixtures)
				.innerJoin(teams, eq(fixtures.awayTeamId, teams.id))
				.where(eq(fixtures.id, prediction.fixture.id))
				.then((res) => res[0]);

			if (fixture) {
				awayTeamInfo.set(fixture.fixtureId, fixture.awayTeam);
			}
		}

		// Calculate overall stats
		const totalPredictions = userPredictions.length;
		const completedPredictions = userPredictions.filter(
			(p) => p.fixture.status === 'completed'
		).length;
		const totalPoints = userPredictions.reduce((sum, p) => sum + (p.prediction.points || 0), 0);
		const correctScorelines = userPredictions.filter(
			(p) => p.prediction.points === POINTS_CORRECT_SCORE
		).length;
		const correctOutcomes = userPredictions.filter(
			(p) => p.prediction.points === POINTS_CORRECT_OUTCOME
		).length;
		const incorrectPredictions = userPredictions.filter(
			(p) => p.fixture.status === 'completed' && p.prediction.points === 0
		).length;

		// Print summary
		console.log('\nPrediction Summary:');
		console.log('==========================================');
		console.log(`Total Predictions: ${totalPredictions}`);
		console.log(`Completed Fixtures: ${completedPredictions}`);
		console.log(`Total Points: ${totalPoints}`);
		console.log(`Correct Scorelines: ${correctScorelines}`);
		console.log(`Correct Outcomes: ${correctOutcomes}`);
		console.log(`Incorrect Predictions: ${incorrectPredictions}`);
		console.log('==========================================');

		// Print detailed predictions
		console.log('\nDetailed Predictions:');
		console.log(
			'================================================================================================='
		);
		console.log(
			'Week | Match                       | Prediction | Actual    | Status     | Points | Result'
		);
		console.log(
			'================================================================================================='
		);

		for (const prediction of userPredictions) {
			const awayTeam = awayTeamInfo.get(prediction.fixture.id);

			if (!awayTeam) continue;

			const match = `${prediction.homeTeam.shortName} vs ${awayTeam.shortName}`;
			const predictionScore = `${prediction.prediction.predictedHomeScore}-${prediction.prediction.predictedAwayScore}`;

			let actualScore = 'N/A';
			if (prediction.fixture.homeScore !== null && prediction.fixture.awayScore !== null) {
				actualScore = `${prediction.fixture.homeScore}-${prediction.fixture.awayScore}`;
			}

			let result = 'N/A';
			if (prediction.fixture.status === 'completed') {
				if (prediction.prediction.points === POINTS_CORRECT_SCORE) {
					result = 'Exact Score ✓';
				} else if (prediction.prediction.points === POINTS_CORRECT_OUTCOME) {
					result = 'Correct Outcome ✓';
				} else {
					result = 'Incorrect ✗';
				}
			}

			console.log(
				`${String(prediction.fixture.weekId).padEnd(4)} | ${match.padEnd(28)} | ${predictionScore.padEnd(10)} | ${actualScore.padEnd(10)} | ${prediction.fixture.status.padEnd(10)} | ${String(prediction.prediction.points || 0).padEnd(6)} | ${result}`
			);
		}

		console.log(
			'================================================================================================='
		);
	} catch (error) {
		console.error('❌ Failed to generate user prediction report:', error);
		process.exit(1);
	}
}

// Run the function
userPredictionReport().catch(console.error);
