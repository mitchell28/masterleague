import { db } from '$lib/server/db';
import { fixtures, predictions, leagueTable } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

interface Prediction {
	id: string;
	userId: string;
	fixtureId: string;
	predictedHomeScore: number;
	predictedAwayScore: number;
	points?: number;
}

interface Fixture {
	id: string;
	homeScore: number | null;
	awayScore: number | null;
	pointsMultiplier: number;
	status: string;
}

interface UserStats {
	totalPoints: number;
	correctScorelines: number;
	correctOutcomes: number;
	processedPredictions: number;
}

import {
	calculatePredictionPoints as calculatePoints,
	getMatchOutcome
} from '$lib/server/engine/shared/utils.js';

interface PointsCalculationResult {
	points: number;
	isCorrect: boolean;
	type: 'perfect' | 'outcome' | 'incorrect';
	multipliedPoints: number;
}

interface ProcessingResult {
	processedFixtures: number;
	processedPredictions: number;
	updatedUsers: number;
}

/**
 * Hook for managing points calculation functionality
 * Provides utilities for calculating, validating, and processing prediction points
 */
export function usePointsCalculation() {
	/**
	 * Calculate points for a single prediction
	 * @param predictedHomeScore The predicted home team score
	 * @param predictedAwayScore The predicted away team score
	 * @param actualHomeScore The actual home team score
	 * @param actualAwayScore The actual away team score
	 * @param pointsMultiplier The multiplier for this fixture (default: 1)
	 * @returns PointsCalculationResult with points, correctness, and type
	 */
	function calculatePredictionPoints(
		predictedHomeScore: number,
		predictedAwayScore: number,
		actualHomeScore: number,
		actualAwayScore: number,
		pointsMultiplier = 1
	): PointsCalculationResult {
		// Use the shared calculation function
		const basePoints = calculatePoints(
			predictedHomeScore,
			predictedAwayScore,
			actualHomeScore,
			actualAwayScore,
			1 // Use 1 for base calculation, apply multiplier separately
		);

		// Determine the type of prediction
		let type: 'perfect' | 'outcome' | 'incorrect';
		if (predictedHomeScore === actualHomeScore && predictedAwayScore === actualAwayScore) {
			type = 'perfect';
		} else if (basePoints > 0) {
			type = 'outcome';
		} else {
			type = 'incorrect';
		}

		const multipliedPoints = basePoints * pointsMultiplier;

		return {
			points: basePoints,
			multipliedPoints,
			isCorrect: basePoints > 0,
			type
		};
	}

	/**
	 * Calculate potential points for a prediction (used for UI display)
	 * @param prediction The prediction object
	 * @param fixture The fixture object
	 * @returns PointsCalculationResult or null if scores not available
	 */
	function calculatePotentialPoints(
		prediction: Pick<Prediction, 'predictedHomeScore' | 'predictedAwayScore'>,
		fixture: Pick<Fixture, 'homeScore' | 'awayScore' | 'pointsMultiplier'>
	): PointsCalculationResult | null {
		if (fixture.homeScore === null || fixture.awayScore === null) {
			return null;
		}

		return calculatePredictionPoints(
			prediction.predictedHomeScore,
			prediction.predictedAwayScore,
			fixture.homeScore,
			fixture.awayScore,
			fixture.pointsMultiplier
		);
	}

	/**
	 * Validate if scores are valid for predictions
	 * @param homeScore Home team score
	 * @param awayScore Away team score
	 * @returns Validation result with isValid flag and error message
	 */
	function validateScores(
		homeScore: number,
		awayScore: number
	): { isValid: boolean; error?: string } {
		if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
			return { isValid: false, error: 'Scores must be whole numbers' };
		}

		if (homeScore < 0 || awayScore < 0) {
			return { isValid: false, error: 'Scores cannot be negative' };
		}

		if (homeScore > 50 || awayScore > 50) {
			return { isValid: false, error: 'Scores seem unrealistically high' };
		}

		return { isValid: true };
	}

	/**
	 * Get points breakdown for display purposes
	 * @param pointsMultiplier The multiplier for the fixture
	 * @returns Object with potential points for each outcome type
	 */
	function getPointsBreakdown(pointsMultiplier = 1) {
		return {
			perfect: {
				base: 3,
				multiplied: 3 * pointsMultiplier,
				label: 'Perfect Score'
			},
			outcome: {
				base: 1,
				multiplied: 1 * pointsMultiplier,
				label: 'Correct Outcome'
			},
			incorrect: {
				base: 0,
				multiplied: 0,
				label: 'Incorrect'
			}
		};
	}

	/**
	 * Process points for specific fixtures (server-side operation)
	 * @param fixtureIds Array of fixture IDs to process
	 * @returns Processing result with counts
	 */
	async function processRecentFixtures(fixtureIds?: string[]): Promise<ProcessingResult> {
		try {
			let processedFixtures = 0;
			let processedPredictions = 0;
			let updatedUsers = 0;

			// Get completed fixtures to process
			const whereClause = fixtureIds
				? and(eq(fixtures.status, 'FINISHED'), inArray(fixtures.id, fixtureIds))
				: eq(fixtures.status, 'FINISHED');

			const targetFixtures = await db.select().from(fixtures).where(whereClause);

			if (targetFixtures.length === 0) {
				return { processedFixtures: 0, processedPredictions: 0, updatedUsers: 0 };
			}

			// Track user stats for batch update
			const userStats: Record<string, UserStats> = {};

			// Process each fixture
			for (const fixture of targetFixtures) {
				if (fixture.homeScore === null || fixture.awayScore === null) {
					continue;
				}

				// Get all predictions for this fixture
				const fixturePredictions = await db
					.select()
					.from(predictions)
					.where(eq(predictions.fixtureId, fixture.id));

				// Process each prediction
				for (const prediction of fixturePredictions) {
					// Calculate points with multiplier
					const result = calculatePredictionPoints(
						prediction.predictedHomeScore,
						prediction.predictedAwayScore,
						fixture.homeScore,
						fixture.awayScore,
						fixture.pointsMultiplier
					);

					// Update the prediction
					await db
						.update(predictions)
						.set({ points: result.multipliedPoints })
						.where(eq(predictions.id, prediction.id));

					// Track user stats
					if (!userStats[prediction.userId]) {
						userStats[prediction.userId] = {
							totalPoints: 0,
							correctScorelines: 0,
							correctOutcomes: 0,
							processedPredictions: 0
						};
					}

					userStats[prediction.userId].totalPoints += result.multipliedPoints;
					userStats[prediction.userId].processedPredictions++;

					// Track correctness type
					if (result.type === 'perfect') {
						userStats[prediction.userId].correctScorelines++;
					} else if (result.type === 'outcome') {
						userStats[prediction.userId].correctOutcomes++;
					}

					processedPredictions++;
				}

				// Mark the fixture as processed
				await db
					.update(fixtures)
					.set({ lastUpdated: new Date() })
					.where(eq(fixtures.id, fixture.id));

				processedFixtures++;
			}

			// Update league table for affected users
			for (const [userId, stats] of Object.entries(userStats)) {
				await db
					.update(leagueTable)
					.set({
						totalPoints: stats.totalPoints,
						correctScorelines: stats.correctScorelines,
						correctOutcomes: stats.correctOutcomes,
						lastUpdated: new Date()
					})
					.where(eq(leagueTable.userId, userId));

				updatedUsers++;
			}

			return { processedFixtures, processedPredictions, updatedUsers };
		} catch (error) {
			console.error('Error processing fixture points:', error);
			throw error;
		}
	}

	/**
	 * Calculate statistics for a set of predictions
	 * @param predictions Array of predictions to analyze
	 * @returns Statistics object with totals and averages
	 */
	function calculatePredictionStats(predictions: Prediction[]) {
		const withPoints = predictions.filter((p) => p.points !== undefined);
		const totalPoints = withPoints.reduce((sum, p) => sum + (p.points || 0), 0);
		const perfectScores = withPoints.filter((p) => p.points && p.points >= 3).length;
		const correctOutcomes = withPoints.filter((p) => p.points === 1).length;

		return {
			total: predictions.length,
			scored: withPoints.length,
			pending: predictions.length - withPoints.length,
			totalPoints,
			perfectScores,
			correctOutcomes,
			incorrectPredictions: withPoints.length - perfectScores - correctOutcomes,
			averagePoints: withPoints.length > 0 ? totalPoints / withPoints.length : 0
		};
	}

	return {
		calculatePredictionPoints,
		calculatePotentialPoints,
		getMatchOutcome,
		validateScores,
		getPointsBreakdown,
		processRecentFixtures,
		calculatePredictionStats
	};
}
