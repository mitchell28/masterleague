/**
 * Shared utility functions for prediction calculations
 * Used across server-side prediction processing
 */

/**
 * Calculates points for a prediction based on actual match result
 * This is the canonical implementation used across the application
 */
export function calculatePredictionPoints(
	predictedHomeScore: number,
	predictedAwayScore: number,
	actualHomeScore: number,
	actualAwayScore: number,
	pointsMultiplier = 1
): number {
	// Perfect score: 3 points × multiplier
	if (predictedHomeScore === actualHomeScore && predictedAwayScore === actualAwayScore) {
		return 3 * pointsMultiplier;
	}

	// Correct outcome: 1 point × multiplier
	const predictedOutcome =
		predictedHomeScore > predictedAwayScore
			? 'home'
			: predictedHomeScore < predictedAwayScore
				? 'away'
				: 'draw';

	const actualOutcome =
		actualHomeScore > actualAwayScore
			? 'home'
			: actualHomeScore < actualAwayScore
				? 'away'
				: 'draw';

	if (predictedOutcome === actualOutcome) {
		return 1 * pointsMultiplier;
	}

	// No points for incorrect predictions
	return 0;
}

/**
 * Determines the outcome of a match from scores
 */
export function getMatchOutcome(homeScore: number, awayScore: number): 'home' | 'away' | 'draw' {
	if (homeScore > awayScore) return 'home';
	if (homeScore < awayScore) return 'away';
	return 'draw';
}

/**
 * Validates prediction scores
 */
export function isValidPrediction(homeScore: number, awayScore: number): boolean {
	return (
		typeof homeScore === 'number' &&
		typeof awayScore === 'number' &&
		homeScore >= 0 &&
		awayScore >= 0 &&
		Number.isInteger(homeScore) &&
		Number.isInteger(awayScore)
	);
}
