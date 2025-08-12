import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, resetDatabase } from '../database';
import { UserFactory, FixtureFactory, PredictionFactory, TeamFactory } from '../factories';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Game State Transitions', () => {
	beforeEach(async () => {
		await resetDatabase(true);
	});

	describe('Fixture Status Transitions', () => {
		it('should transition fixture from scheduled to live', async () => {
			const db = getTestDb();
			const fixture = await FixtureFactory.createScheduled();

			// Simulate fixture going live
			await db
				.update(schema.fixtures)
				.set({
					status: 'IN_PLAY',
					matchDate: new Date(),
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixture.id));

			const [updatedFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(updatedFixture.status).toBe('IN_PLAY');
			expect(updatedFixture.lastUpdated).toBeTruthy();
		});

		it('should transition fixture from live to finished with scores', async () => {
			const db = getTestDb();
			const fixture = await FixtureFactory.createLive();

			// Simulate fixture finishing
			await db
				.update(schema.fixtures)
				.set({
					status: 'FINISHED',
					homeScore: 3,
					awayScore: 1,
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixture.id));

			const [finishedFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(finishedFixture.status).toBe('FINISHED');
			expect(finishedFixture.homeScore).toBe(3);
			expect(finishedFixture.awayScore).toBe(1);
		});

		it('should handle fixture postponement', async () => {
			const db = getTestDb();
			const fixture = await FixtureFactory.createScheduled();

			// Simulate fixture postponement
			await db
				.update(schema.fixtures)
				.set({
					status: 'POSTPONED',
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixture.id));

			const [postponedFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(postponedFixture.status).toBe('POSTPONED');
			expect(postponedFixture.homeScore).toBeNull();
			expect(postponedFixture.awayScore).toBeNull();
		});

		it('should handle fixture rescheduling after postponement', async () => {
			const db = getTestDb();
			const fixture = await FixtureFactory.createPostponed();

			const newDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next week

			// Simulate fixture rescheduling
			await db
				.update(schema.fixtures)
				.set({
					status: 'TIMED',
					matchDate: newDate,
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixture.id));

			const [rescheduledFixture] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(rescheduledFixture.status).toBe('TIMED');
			expect(rescheduledFixture.matchDate.getTime()).toBe(newDate.getTime());
		});
	});

	describe('Score Updates During Live Matches', () => {
		it('should handle incremental score updates', async () => {
			const db = getTestDb();
			const fixture = await FixtureFactory.createLive({
				homeScore: 0,
				awayScore: 0
			});

			// First goal
			await db
				.update(schema.fixtures)
				.set({
					homeScore: 1,
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixture.id));

			let [updated] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(updated.homeScore).toBe(1);
			expect(updated.awayScore).toBe(0);

			// Second goal
			await db
				.update(schema.fixtures)
				.set({
					awayScore: 1,
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixture.id));

			[updated] = await db.select().from(schema.fixtures).where(eq(schema.fixtures.id, fixture.id));

			expect(updated.homeScore).toBe(1);
			expect(updated.awayScore).toBe(1);
		});

		it('should handle score corrections', async () => {
			const db = getTestDb();
			const fixture = await FixtureFactory.createLive({
				homeScore: 2,
				awayScore: 1
			});

			// Score correction (VAR disallowed goal)
			await db
				.update(schema.fixtures)
				.set({
					homeScore: 1,
					lastUpdated: new Date()
				})
				.where(eq(schema.fixtures.id, fixture.id));

			const [corrected] = await db
				.select()
				.from(schema.fixtures)
				.where(eq(schema.fixtures.id, fixture.id));

			expect(corrected.homeScore).toBe(1);
			expect(corrected.awayScore).toBe(1);
		});
	});

	describe('Prediction Locking States', () => {
		it('should test prediction timing constraints', async () => {
			const user = await UserFactory.create();
			const org = await FixtureFactory.create().then((f) => ({ id: 'test-org' }));

			// Future fixture - predictions allowed
			const futureFixture = await FixtureFactory.create({
				matchDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
				status: 'TIMED'
			});

			// Soon fixture - predictions locked (< 30 minutes)
			const soonFixture = await FixtureFactory.create({
				matchDate: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
				status: 'TIMED'
			});

			// Live fixture - predictions locked
			const liveFixture = await FixtureFactory.createLive();

			// Test prediction timing logic
			const canPredictFuture = canPredictFixture(futureFixture);
			const canPredictSoon = canPredictFixture(soonFixture);
			const canPredictLive = canPredictFixture(liveFixture);

			expect(canPredictFuture).toBe(true);
			expect(canPredictSoon).toBe(false);
			expect(canPredictLive).toBe(false);
		});

		it('should handle prediction updates before kickoff', async () => {
			const db = getTestDb();
			const user = await UserFactory.create();
			const fixture = await FixtureFactory.create({
				matchDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
				status: 'TIMED'
			});

			const prediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				predictedHomeScore: 2,
				predictedAwayScore: 1
			});

			// Update prediction before kickoff
			await db
				.update(schema.predictions)
				.set({
					predictedHomeScore: 3,
					predictedAwayScore: 0
				})
				.where(eq(schema.predictions.id, prediction.id));

			const [updated] = await db
				.select()
				.from(schema.predictions)
				.where(eq(schema.predictions.id, prediction.id));

			expect(updated.predictedHomeScore).toBe(3);
			expect(updated.predictedAwayScore).toBe(0);
		});
	});

	describe('Points Calculation State Changes', () => {
		it('should calculate points for exact score predictions', async () => {
			const user = await UserFactory.create();
			const fixture = await FixtureFactory.createFinished({
				homeScore: 2,
				awayScore: 1
			});

			const exactPrediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				predictedHomeScore: 2,
				predictedAwayScore: 1
			});

			// Calculate points (this would normally be done by a service)
			const points = calculatePredictionPoints(exactPrediction, fixture);
			expect(points).toBe(5); // Exact score = 5 points
		});

		it('should calculate points for correct outcome predictions', async () => {
			const user = await UserFactory.create();
			const fixture = await FixtureFactory.createFinished({
				homeScore: 3,
				awayScore: 1
			});

			const outcomePrediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				predictedHomeScore: 2,
				predictedAwayScore: 0
			});

			const points = calculatePredictionPoints(outcomePrediction, fixture);
			expect(points).toBe(3); // Correct outcome = 3 points
		});

		it('should handle draw predictions', async () => {
			const user = await UserFactory.create();
			const fixture = await FixtureFactory.createFinished({
				homeScore: 1,
				awayScore: 1
			});

			const exactDrawPrediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				predictedHomeScore: 1,
				predictedAwayScore: 1
			});

			const wrongDrawPrediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				predictedHomeScore: 2,
				predictedAwayScore: 2
			});

			expect(calculatePredictionPoints(exactDrawPrediction, fixture)).toBe(5);
			expect(calculatePredictionPoints(wrongDrawPrediction, fixture)).toBe(3);
		});

		it('should handle zero points for incorrect predictions', async () => {
			const user = await UserFactory.create();
			const fixture = await FixtureFactory.createFinished({
				homeScore: 2,
				awayScore: 1
			});

			const wrongPrediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				predictedHomeScore: 0,
				predictedAwayScore: 3
			});

			const points = calculatePredictionPoints(wrongPrediction, fixture);
			expect(points).toBe(0); // Wrong outcome = 0 points
		});
	});

	describe('Multiplier Effects', () => {
		it('should apply points multipliers correctly', async () => {
			const user = await UserFactory.create();
			const fixture = await FixtureFactory.createFinished({
				homeScore: 2,
				awayScore: 1,
				pointsMultiplier: 2 // Double points fixture
			});

			const prediction = await PredictionFactory.create({
				userId: user.id,
				fixtureId: fixture.id,
				predictedHomeScore: 2,
				predictedAwayScore: 1
			});

			const basePoints = calculatePredictionPoints(prediction, fixture);
			const finalPoints = basePoints * fixture.pointsMultiplier;

			expect(basePoints).toBe(5);
			expect(finalPoints).toBe(10);
		});
	});
});

// Helper functions that would normally be in your business logic
function canPredictFixture(fixture: any): boolean {
	const inProgressOrCompleted = [
		'IN_PLAY',
		'PAUSED',
		'FINISHED',
		'SUSPENDED',
		'POSTPONED',
		'CANCELLED',
		'AWARDED'
	].includes(fixture.status);

	if (inProgressOrCompleted) return false;

	const matchDate = new Date(fixture.matchDate);
	const now = new Date();
	const cutoffTime = new Date(matchDate.getTime() - 30 * 60 * 1000); // 30 minutes before

	return now < cutoffTime;
}

function calculatePredictionPoints(prediction: any, fixture: any): number {
	const predictedHomeScore = prediction.predictedHomeScore;
	const predictedAwayScore = prediction.predictedAwayScore;
	const actualHomeScore = fixture.homeScore;
	const actualAwayScore = fixture.awayScore;

	// Exact score match
	if (predictedHomeScore === actualHomeScore && predictedAwayScore === actualAwayScore) {
		return 5;
	}

	// Correct outcome
	const predictedOutcome = getOutcome(predictedHomeScore, predictedAwayScore);
	const actualOutcome = getOutcome(actualHomeScore, actualAwayScore);

	if (predictedOutcome === actualOutcome) {
		return 3;
	}

	return 0;
}

function getOutcome(homeScore: number, awayScore: number): 'home' | 'away' | 'draw' {
	if (homeScore > awayScore) return 'home';
	if (awayScore > homeScore) return 'away';
	return 'draw';
}
