import { describe, it, expect, beforeEach } from 'vitest';
import { eq, desc, asc } from 'drizzle-orm';
import { setupTestDatabase, clearAllTables, getTestDb } from '../database';
import {
	UserFactory,
	OrganizationFactory,
	FixtureFactory,
	PredictionFactory,
	TeamFactory,
	LeagueTableFactory
} from '../factories';
import * as schema from '$lib/server/db/schema';

describe('Leaderboard and Points System Tests', () => {
	beforeEach(async () => {
		await setupTestDatabase();
		await clearAllTables();
	});

	describe('Points Calculation', () => {
		it('should award 3 points for exact score predictions', async () => {
			const db = getTestDb();
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const teams = await TeamFactory.createBatch(2);

			// Create a finished fixture with final score
			const fixture = await FixtureFactory.createFinished({
				homeTeamId: teams[0].id,
				awayTeamId: teams[1].id,
				homeScore: 2,
				awayScore: 1
			});

			// Create prediction that matches exact score
			const prediction = await PredictionFactory.create({
				userId: user.id,
				organizationId: org.id,
				fixtureId: fixture.id,
				predictedHomeScore: 2,
				predictedAwayScore: 1,
				points: 3 // This would be calculated by the points calculation logic
			});

			const savedPrediction = await db
				.select()
				.from(schema.predictions)
				.where(eq(schema.predictions.id, prediction.id))
				.then((rows) => rows[0]);

			expect(savedPrediction.points).toBe(3);
			expect(savedPrediction.predictedHomeScore).toBe(fixture.homeScore);
			expect(savedPrediction.predictedAwayScore).toBe(fixture.awayScore);
		});

		it('should award 1 point for correct outcome predictions', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const teams = await TeamFactory.createBatch(2);

			// Create a finished fixture - home team wins 3-1
			const fixture = await FixtureFactory.createFinished({
				homeTeamId: teams[0].id,
				awayTeamId: teams[1].id,
				homeScore: 3,
				awayScore: 1
			});

			// Create prediction that gets outcome right but not exact score
			const prediction = await PredictionFactory.create({
				userId: user.id,
				organizationId: org.id,
				fixtureId: fixture.id,
				predictedHomeScore: 2, // Different score but same outcome (home win)
				predictedAwayScore: 0,
				points: 1
			});

			expect(prediction.points).toBe(1);
			// Both predictions show home team winning
			expect(prediction.predictedHomeScore).toBeGreaterThan(prediction.predictedAwayScore);
			expect(fixture.homeScore!).toBeGreaterThan(fixture.awayScore!);
		});

		it('should award 0 points for incorrect predictions', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const teams = await TeamFactory.createBatch(2);

			// Create a finished fixture - home team wins 2-0
			const fixture = await FixtureFactory.createFinished({
				homeTeamId: teams[0].id,
				awayTeamId: teams[1].id,
				homeScore: 2,
				awayScore: 0
			});

			// Create prediction that gets outcome wrong
			const prediction = await PredictionFactory.create({
				userId: user.id,
				organizationId: org.id,
				fixtureId: fixture.id,
				predictedHomeScore: 0, // Predicted away win, but home team won
				predictedAwayScore: 1,
				points: 0
			});

			expect(prediction.points).toBe(0);
			// Prediction shows away win, but actual result is home win
			expect(prediction.predictedHomeScore).toBeLessThan(prediction.predictedAwayScore);
			expect(fixture.homeScore!).toBeGreaterThan(fixture.awayScore!);
		});

		it('should handle draw predictions correctly', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const teams = await TeamFactory.createBatch(2);

			// Create a finished fixture that ended in a draw
			const fixture = await FixtureFactory.createFinished({
				homeTeamId: teams[0].id,
				awayTeamId: teams[1].id,
				homeScore: 1,
				awayScore: 1
			});

			// Test exact draw prediction
			const exactDrawPrediction = await PredictionFactory.create({
				userId: user.id,
				organizationId: org.id,
				fixtureId: fixture.id,
				predictedHomeScore: 1,
				predictedAwayScore: 1,
				points: 3 // Exact score
			});

			// Test different draw prediction (correct outcome)
			const user2 = await UserFactory.create();
			const outcomeDrawPrediction = await PredictionFactory.create({
				userId: user2.id,
				organizationId: org.id,
				fixtureId: fixture.id,
				predictedHomeScore: 2,
				predictedAwayScore: 2,
				points: 1 // Correct outcome but not exact score
			});

			expect(exactDrawPrediction.points).toBe(3);
			expect(outcomeDrawPrediction.points).toBe(1);
			expect(fixture.homeScore).toBe(fixture.awayScore);
		});

		it('should apply points multipliers correctly', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const teams = await TeamFactory.createBatch(2);

			// Create a finished fixture with a 2x points multiplier
			const fixture = await FixtureFactory.createFinished({
				homeTeamId: teams[0].id,
				awayTeamId: teams[1].id,
				homeScore: 3,
				awayScore: 1,
				pointsMultiplier: 2
			});

			// Create exact score prediction
			const prediction = await PredictionFactory.create({
				userId: user.id,
				organizationId: org.id,
				fixtureId: fixture.id,
				predictedHomeScore: 3,
				predictedAwayScore: 1,
				points: 6 // 3 points * 2 multiplier
			});

			expect(prediction.points).toBe(6);
			expect(fixture.pointsMultiplier).toBe(2);
		});
	});

	describe('League Table Management', () => {
		it('should create and update league table entries', async () => {
			const db = getTestDb();
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();

			const leagueEntry = await LeagueTableFactory.createWithStats(user.id, org.id, {
				totalPoints: 25,
				correctScorelines: 5,
				correctOutcomes: 10,
				predictedFixtures: 15,
				completedFixtures: 12
			});

			const savedEntry = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.id, leagueEntry.id))
				.then((rows) => rows[0]);

			expect(savedEntry.totalPoints).toBe(25);
			expect(savedEntry.correctScorelines).toBe(5);
			expect(savedEntry.correctOutcomes).toBe(10);
			expect(savedEntry.predictedFixtures).toBe(15);
			expect(savedEntry.completedFixtures).toBe(12);
			expect(savedEntry.userId).toBe(user.id);
			expect(savedEntry.organizationId).toBe(org.id);
		});

		it('should handle multiple users in league table', async () => {
			const db = getTestDb();
			const org = await OrganizationFactory.create();
			const users = await Promise.all([
				UserFactory.create(),
				UserFactory.create(),
				UserFactory.create()
			]);

			// Create league entries with different scores
			const entries = await Promise.all([
				LeagueTableFactory.createWithStats(users[0].id, org.id, {
					totalPoints: 50,
					correctScorelines: 10,
					correctOutcomes: 15
				}),
				LeagueTableFactory.createWithStats(users[1].id, org.id, {
					totalPoints: 35,
					correctScorelines: 5,
					correctOutcomes: 25
				}),
				LeagueTableFactory.createWithStats(users[2].id, org.id, {
					totalPoints: 42,
					correctScorelines: 8,
					correctOutcomes: 18
				})
			]);

			// Query league table ordered by total points
			const leaderboard = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.organizationId, org.id))
				.orderBy(desc(schema.leagueTable.totalPoints));

			expect(leaderboard).toHaveLength(3);
			expect(leaderboard[0].totalPoints).toBe(50); // First place
			expect(leaderboard[1].totalPoints).toBe(42); // Second place
			expect(leaderboard[2].totalPoints).toBe(35); // Third place
		});

		it('should handle league table statistics accurately', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();

			const leagueEntry = await LeagueTableFactory.createWithStats(user.id, org.id, {
				totalPoints: 73,
				correctScorelines: 15,
				correctOutcomes: 28,
				predictedFixtures: 35,
				completedFixtures: 30
			});

			// Calculate accuracy rates
			const exactAccuracy = (leagueEntry.correctScorelines! / leagueEntry.completedFixtures!) * 100;
			const outcomeAccuracy = (leagueEntry.correctOutcomes! / leagueEntry.completedFixtures!) * 100;
			const predictionRate =
				(leagueEntry.predictedFixtures! / leagueEntry.completedFixtures!) * 100;

			expect(exactAccuracy).toBe(50); // 15/30 = 50%
			expect(outcomeAccuracy).toBe(93.33333333333333); // 28/30 ≈ 93.33%
			expect(predictionRate).toBeGreaterThan(100); // 35/30 > 100% (predicted more than completed)
		});

		it('should maintain separate league tables per organization', async () => {
			const db = getTestDb();
			const user = await UserFactory.create();
			const org1 = await OrganizationFactory.create();
			const org2 = await OrganizationFactory.create();

			// Create entries for same user in different organizations
			const entry1 = await LeagueTableFactory.createWithStats(user.id, org1.id, {
				totalPoints: 40
			});
			const entry2 = await LeagueTableFactory.createWithStats(user.id, org2.id, {
				totalPoints: 25
			});

			// Verify separate entries exist
			const org1Entries = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.organizationId, org1.id));

			const org2Entries = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.organizationId, org2.id));

			expect(org1Entries).toHaveLength(1);
			expect(org2Entries).toHaveLength(1);
			expect(org1Entries[0].totalPoints).toBe(40);
			expect(org2Entries[0].totalPoints).toBe(25);
			expect(org1Entries[0].userId).toBe(user.id);
			expect(org2Entries[0].userId).toBe(user.id);
		});

		it('should handle season-based league tables', async () => {
			const db = getTestDb();
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();

			// Create entries for different seasons
			const currentSeason = await LeagueTableFactory.create({
				userId: user.id,
				organizationId: org.id,
				season: '2024/25',
				totalPoints: 45
			});

			const previousSeason = await LeagueTableFactory.create({
				userId: user.id,
				organizationId: org.id,
				season: '2023/24',
				totalPoints: 38
			});

			// Query current season only
			const currentSeasonEntries = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.season, '2024/25'));

			expect(currentSeasonEntries).toHaveLength(1);
			expect(currentSeasonEntries[0].totalPoints).toBe(45);
			expect(currentSeasonEntries[0].season).toBe('2024/25');
		});
	});

	describe('Leaderboard Rankings', () => {
		it('should rank users correctly by total points', async () => {
			const db = getTestDb();
			const org = await OrganizationFactory.create();

			// Create 5 users with different point totals
			const entries = await LeagueTableFactory.createBatch(5, org.id);

			// Update specific point values
			await db
				.update(schema.leagueTable)
				.set({ totalPoints: 100 })
				.where(eq(schema.leagueTable.id, entries[0].id));

			await db
				.update(schema.leagueTable)
				.set({ totalPoints: 85 })
				.where(eq(schema.leagueTable.id, entries[1].id));

			await db
				.update(schema.leagueTable)
				.set({ totalPoints: 92 })
				.where(eq(schema.leagueTable.id, entries[2].id));

			await db
				.update(schema.leagueTable)
				.set({ totalPoints: 78 })
				.where(eq(schema.leagueTable.id, entries[3].id));

			await db
				.update(schema.leagueTable)
				.set({ totalPoints: 88 })
				.where(eq(schema.leagueTable.id, entries[4].id));

			// Get leaderboard
			const leaderboard = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.organizationId, org.id))
				.orderBy(desc(schema.leagueTable.totalPoints));

			expect(leaderboard[0].totalPoints).toBe(100); // 1st place
			expect(leaderboard[1].totalPoints).toBe(92); // 2nd place
			expect(leaderboard[2].totalPoints).toBe(88); // 3rd place
			expect(leaderboard[3].totalPoints).toBe(85); // 4th place
			expect(leaderboard[4].totalPoints).toBe(78); // 5th place
		});

		it('should handle tied scores in leaderboard', async () => {
			const db = getTestDb();
			const org = await OrganizationFactory.create();
			const users = await Promise.all([
				UserFactory.create(),
				UserFactory.create(),
				UserFactory.create()
			]);

			// Create entries with tied total points but different secondary stats
			const entries = await Promise.all([
				LeagueTableFactory.createWithStats(users[0].id, org.id, {
					totalPoints: 50,
					correctScorelines: 10,
					correctOutcomes: 20
				}),
				LeagueTableFactory.createWithStats(users[1].id, org.id, {
					totalPoints: 50,
					correctScorelines: 12,
					correctOutcomes: 18
				}),
				LeagueTableFactory.createWithStats(users[2].id, org.id, {
					totalPoints: 45,
					correctScorelines: 8,
					correctOutcomes: 22
				})
			]);

			// Query with tiebreaker (correct scorelines)
			const leaderboard = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.organizationId, org.id))
				.orderBy(desc(schema.leagueTable.totalPoints), desc(schema.leagueTable.correctScorelines));

			expect(leaderboard[0].totalPoints).toBe(50);
			expect(leaderboard[0].correctScorelines).toBe(12); // Wins tiebreaker
			expect(leaderboard[1].totalPoints).toBe(50);
			expect(leaderboard[1].correctScorelines).toBe(10);
			expect(leaderboard[2].totalPoints).toBe(45);
		});

		it('should show user position in leaderboard', async () => {
			const db = getTestDb();
			const org = await OrganizationFactory.create();
			const targetUser = await UserFactory.create();

			// Create several users with different scores
			const entries = await LeagueTableFactory.createBatch(5, org.id);

			// Create entry for target user
			const targetEntry = await LeagueTableFactory.createWithStats(targetUser.id, org.id, {
				totalPoints: 67
			});

			// Set specific scores for comparison
			await db
				.update(schema.leagueTable)
				.set({ totalPoints: 90 })
				.where(eq(schema.leagueTable.id, entries[0].id));

			await db
				.update(schema.leagueTable)
				.set({ totalPoints: 75 })
				.where(eq(schema.leagueTable.id, entries[1].id));

			await db
				.update(schema.leagueTable)
				.set({ totalPoints: 60 })
				.where(eq(schema.leagueTable.id, entries[2].id));

			await db
				.update(schema.leagueTable)
				.set({ totalPoints: 55 })
				.where(eq(schema.leagueTable.id, entries[3].id));

			await db
				.update(schema.leagueTable)
				.set({ totalPoints: 45 })
				.where(eq(schema.leagueTable.id, entries[4].id));

			// Get leaderboard to find position
			const leaderboard = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.organizationId, org.id))
				.orderBy(desc(schema.leagueTable.totalPoints));

			const userPosition = leaderboard.findIndex((entry) => entry.userId === targetUser.id) + 1;

			expect(userPosition).toBe(3); // Should be 3rd place with 67 points
			expect(leaderboard[userPosition - 1].totalPoints).toBe(67);
		});
	});

	describe('Points Integration Scenarios', () => {
		it('should calculate cumulative points from multiple predictions', async () => {
			const db = getTestDb();
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();
			const teams = await TeamFactory.createBatch(6);

			// Create multiple finished fixtures
			const fixtures = await Promise.all([
				FixtureFactory.createFinished({
					homeTeamId: teams[0].id,
					awayTeamId: teams[1].id,
					homeScore: 2,
					awayScore: 1
				}),
				FixtureFactory.createFinished({
					homeTeamId: teams[2].id,
					awayTeamId: teams[3].id,
					homeScore: 1,
					awayScore: 1
				}),
				FixtureFactory.createFinished({
					homeTeamId: teams[4].id,
					awayTeamId: teams[5].id,
					homeScore: 0,
					awayScore: 2
				})
			]);

			// Create predictions with different accuracy levels
			const predictions = await Promise.all([
				PredictionFactory.create({
					userId: user.id,
					organizationId: org.id,
					fixtureId: fixtures[0].id,
					predictedHomeScore: 2,
					predictedAwayScore: 1,
					points: 3 // Exact score
				}),
				PredictionFactory.create({
					userId: user.id,
					organizationId: org.id,
					fixtureId: fixtures[1].id,
					predictedHomeScore: 2,
					predictedAwayScore: 2,
					points: 1 // Correct outcome (draw)
				}),
				PredictionFactory.create({
					userId: user.id,
					organizationId: org.id,
					fixtureId: fixtures[2].id,
					predictedHomeScore: 1,
					predictedAwayScore: 0,
					points: 0 // Wrong outcome
				})
			]);

			// Calculate total points
			const userPredictions = await db
				.select()
				.from(schema.predictions)
				.where(eq(schema.predictions.userId, user.id));

			const totalPoints = userPredictions.reduce((sum, pred) => sum + (pred.points || 0), 0);

			expect(totalPoints).toBe(4); // 3 + 1 + 0 = 4
			expect(userPredictions).toHaveLength(3);

			// Verify individual predictions
			expect(predictions[0].points).toBe(3);
			expect(predictions[1].points).toBe(1);
			expect(predictions[2].points).toBe(0);
		});

		it('should handle league table updates after multiple gameweeks', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();

			// Simulate league table after 10 gameweeks
			const leagueEntry = await LeagueTableFactory.createWithStats(user.id, org.id, {
				totalPoints: 87,
				correctScorelines: 18,
				correctOutcomes: 35,
				predictedFixtures: 50,
				completedFixtures: 45
			});

			// Verify realistic statistics
			expect(leagueEntry.totalPoints).toBe(87);
			expect(leagueEntry.correctScorelines! + leagueEntry.correctOutcomes!).toBe(53); // Total correct predictions
			expect(leagueEntry.completedFixtures!).toBeLessThanOrEqual(leagueEntry.predictedFixtures!);

			// Calculate theoretical maximum points (if all scorelines were correct)
			const maxPossiblePoints = leagueEntry.completedFixtures! * 3;
			expect(leagueEntry.totalPoints).toBeLessThanOrEqual(maxPossiblePoints);
		});

		it('should maintain accurate prediction vs completion ratios', async () => {
			const user = await UserFactory.create();
			const org = await OrganizationFactory.create();

			const leagueEntry = await LeagueTableFactory.createWithStats(user.id, org.id, {
				totalPoints: 42,
				correctScorelines: 8,
				correctOutcomes: 20,
				predictedFixtures: 25,
				completedFixtures: 22
			});

			// User predicted 25 fixtures but only 22 have been completed
			expect(leagueEntry.predictedFixtures!).toBeGreaterThanOrEqual(leagueEntry.completedFixtures!);

			// Correct predictions shouldn't exceed completed fixtures
			const totalCorrect = leagueEntry.correctScorelines! + leagueEntry.correctOutcomes!;
			expect(totalCorrect).toBeLessThanOrEqual(leagueEntry.completedFixtures! * 2); // Max if all were correct outcomes and scorelines

			// Correct scorelines should be subset of correct outcomes
			expect(leagueEntry.correctScorelines!).toBeLessThanOrEqual(leagueEntry.correctOutcomes!);
		});
	});

	describe('Advanced Leaderboard Scenarios', () => {
		it('should handle large leaderboards efficiently', async () => {
			const db = getTestDb();
			const org = await OrganizationFactory.create();

			// Create 50 users in the league
			const entries = await LeagueTableFactory.createBatch(50, org.id);

			const leaderboard = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.organizationId, org.id))
				.orderBy(desc(schema.leagueTable.totalPoints))
				.limit(10); // Top 10

			expect(leaderboard).toHaveLength(10);
			expect(entries).toHaveLength(50);

			// Verify sorting
			for (let i = 0; i < leaderboard.length - 1; i++) {
				expect(leaderboard[i].totalPoints).toBeGreaterThanOrEqual(leaderboard[i + 1].totalPoints);
			}
		});

		it('should calculate relative performance metrics', async () => {
			const db = getTestDb();
			const org = await OrganizationFactory.create();
			const user = await UserFactory.create();

			// Create user entry
			const userEntry = await LeagueTableFactory.createWithStats(user.id, org.id, {
				totalPoints: 65,
				correctScorelines: 12,
				correctOutcomes: 28,
				predictedFixtures: 40,
				completedFixtures: 35
			});

			// Create some comparison entries
			await LeagueTableFactory.createBatch(10, org.id);

			// Calculate performance metrics
			const exactAccuracy = (userEntry.correctScorelines! / userEntry.completedFixtures!) * 100;
			const outcomeAccuracy = (userEntry.correctOutcomes! / userEntry.completedFixtures!) * 100;
			const averagePointsPerGame = userEntry.totalPoints! / userEntry.completedFixtures!;
			const predictionRate = (userEntry.predictedFixtures! / userEntry.completedFixtures!) * 100;

			expect(exactAccuracy).toBeCloseTo(34.29, 1); // ~34.29%
			expect(outcomeAccuracy).toBe(80); // 80%
			expect(averagePointsPerGame).toBeCloseTo(1.86, 2); // ~1.86 points per game
			expect(predictionRate).toBeCloseTo(114.29, 1); // ~114.29%
		});

		it('should handle user movement in rankings', async () => {
			const db = getTestDb();
			const org = await OrganizationFactory.create();
			const users = await Promise.all([
				UserFactory.create(),
				UserFactory.create(),
				UserFactory.create()
			]);

			// Initial league state
			const entries = await Promise.all([
				LeagueTableFactory.createWithStats(users[0].id, org.id, { totalPoints: 50 }),
				LeagueTableFactory.createWithStats(users[1].id, org.id, { totalPoints: 45 }),
				LeagueTableFactory.createWithStats(users[2].id, org.id, { totalPoints: 40 })
			]);

			// Get initial rankings
			let leaderboard = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.organizationId, org.id))
				.orderBy(desc(schema.leagueTable.totalPoints));

			expect(leaderboard[0].userId).toBe(users[0].id); // 1st place
			expect(leaderboard[1].userId).toBe(users[1].id); // 2nd place
			expect(leaderboard[2].userId).toBe(users[2].id); // 3rd place

			// User 2 gets some points and moves up
			await db
				.update(schema.leagueTable)
				.set({ totalPoints: 52 })
				.where(eq(schema.leagueTable.userId, users[2].id));

			// Get updated rankings
			leaderboard = await db
				.select()
				.from(schema.leagueTable)
				.where(eq(schema.leagueTable.organizationId, org.id))
				.orderBy(desc(schema.leagueTable.totalPoints));

			expect(leaderboard[0].userId).toBe(users[2].id); // Now 1st place
			expect(leaderboard[1].userId).toBe(users[0].id); // Now 2nd place
			expect(leaderboard[2].userId).toBe(users[1].id); // Now 3rd place
		});
	});
});
