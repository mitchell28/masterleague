import type { PredictionsFixture, PredictionValue } from './usePredictionsState.svelte';

/**
 * Hook for prediction form validation
 */
export function usePredictionsValidation() {
	// Validate form before submission
	function validateForm(
		fixtures: PredictionsFixture[],
		predictionValues: Record<string, PredictionValue>
	): { isValid: boolean; invalidPredictions: string[] } {
		const invalid: string[] = [];
		const predictableFixtures = fixtures.filter((f) => f.canPredict);

		// Only validate fixtures that can be predicted
		for (const fixture of predictableFixtures) {
			const prediction = predictionValues[fixture.id];
			if (!prediction) continue;

			const { home, away } = prediction;
			if (home < 0 || away < 0 || isNaN(home) || isNaN(away)) {
				invalid.push(fixture.id);
			}
		}

		return {
			isValid: invalid.length === 0,
			invalidPredictions: invalid
		};
	}

	// Validate individual prediction value
	function validatePrediction(home: number, away: number): boolean {
		return home >= 0 && away >= 0 && !isNaN(home) && !isNaN(away);
	}

	// Get validation error message
	function getValidationErrorMessage(invalidCount: number): string {
		if (invalidCount === 0) return '';
		if (invalidCount === 1) return 'Please fix the invalid prediction highlighted in red';
		return `Please fix the ${invalidCount} invalid predictions highlighted in red`;
	}

	return {
		validateForm,
		validatePrediction,
		getValidationErrorMessage
	};
}
