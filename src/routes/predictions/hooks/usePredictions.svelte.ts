interface Prediction {
	id: string;
	homeScore: number | null;
	awayScore: number | null;
	isSubmitted: boolean;
	points?: number;
	isCorrect?: boolean;
}

interface Fixture {
	id: string;
	homeTeam: string;
	awayTeam: string;
	kickoffTime: string;
	status: string;
	homeScore?: number;
	awayScore?: number;
	multiplier?: number;
}

interface UsePredictionsOptions {
	autoSave?: boolean;
	autoSaveDelay?: number;
}

/**
 * Hook for managing predictions functionality
 * @param options Configuration options for predictions
 * @returns Object with prediction state and utilities
 */
export function usePredictions(
	fixtures: Fixture[],
	initialPredictions: Prediction[],
	options: UsePredictionsOptions = {}
) {
	const { autoSave = false, autoSaveDelay = 2000 } = options;

	let predictions = $state<Map<string, Prediction>>(
		new Map(initialPredictions.map((p) => [p.id, p]))
	);
	let hasUnsavedChanges = $state(false);
	let isSaving = $state(false);

	// Auto-save effect
	$effect(() => {
		if (!autoSave || !hasUnsavedChanges || isSaving) return;

		const timer = setTimeout(async () => {
			await savePredictions();
		}, autoSaveDelay);

		return () => clearTimeout(timer);
	});

	/**
	 * Update a prediction for a specific fixture
	 */
	function updatePrediction(fixtureId: string, homeScore: number | null, awayScore: number | null) {
		const existing = predictions.get(fixtureId);
		const updated: Prediction = {
			id: fixtureId,
			homeScore,
			awayScore,
			isSubmitted: existing?.isSubmitted ?? false,
			points: existing?.points,
			isCorrect: existing?.isCorrect
		};

		predictions.set(fixtureId, updated);
		hasUnsavedChanges = true;
	}

	/**
	 * Submit a prediction (locks it in)
	 */
	function submitPrediction(fixtureId: string) {
		const prediction = predictions.get(fixtureId);
		if (!prediction) return;

		predictions.set(fixtureId, {
			...prediction,
			isSubmitted: true
		});
		hasUnsavedChanges = true;
	}

	/**
	 * Check if a prediction is valid
	 */
	function isValidPrediction(fixtureId: string): boolean {
		const prediction = predictions.get(fixtureId);
		return !!(prediction?.homeScore !== null && prediction?.awayScore !== null);
	}

	/**
	 * Check if a fixture can still be predicted
	 */
	function canPredict(fixture: Fixture): boolean {
		const kickoffTime = new Date(fixture.kickoffTime);
		const now = new Date();
		return now < kickoffTime && fixture.status !== 'FINISHED';
	}

	/**
	 * Get prediction for a specific fixture
	 */
	function getPrediction(fixtureId: string): Prediction | undefined {
		return predictions.get(fixtureId);
	}

	/**
	 * Calculate potential points for a prediction
	 */
	function calculatePotentialPoints(
		homeScore: number | null,
		awayScore: number | null,
		fixture: Fixture
	): number {
		if (homeScore === null || awayScore === null) return 0;
		if (!fixture.homeScore !== null || fixture.awayScore === null) return 0;

		const multiplier = fixture.multiplier || 1;

		// Perfect score
		if (homeScore === fixture.homeScore && awayScore === fixture.awayScore) {
			return 3 * multiplier;
		}

		// Correct outcome
		const predictedOutcome =
			homeScore > awayScore ? 'HOME' : homeScore < awayScore ? 'AWAY' : 'DRAW';
		const actualOutcome =
			fixture.homeScore! > fixture.awayScore!
				? 'HOME'
				: fixture.homeScore! < fixture.awayScore!
					? 'AWAY'
					: 'DRAW';

		if (predictedOutcome === actualOutcome) {
			return 1 * multiplier;
		}

		return 0;
	}

	/**
	 * Get summary statistics
	 */
	function getStatistics() {
		const allPredictions = Array.from(predictions.values());
		const submitted = allPredictions.filter((p) => p.isSubmitted);
		const withPoints = allPredictions.filter((p) => p.points !== undefined);
		const correct = allPredictions.filter((p) => p.isCorrect);

		return {
			total: allPredictions.length,
			submitted: submitted.length,
			scored: withPoints.length,
			correct: correct.length,
			totalPoints: withPoints.reduce((sum, p) => sum + (p.points || 0), 0),
			successRate: submitted.length > 0 ? Math.round((correct.length / submitted.length) * 100) : 0
		};
	}

	/**
	 * Save predictions to server
	 */
	async function savePredictions() {
		if (isSaving) return;

		isSaving = true;
		try {
			// Convert Map to array for API
			const predictionsArray = Array.from(predictions.values());

			const response = await fetch('/api/predictions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ predictions: predictionsArray })
			});

			if (!response.ok) {
				throw new Error('Failed to save predictions');
			}

			hasUnsavedChanges = false;
		} catch (error) {
			console.error('Error saving predictions:', error);
			throw error;
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Reset all unsaved changes
	 */
	function resetChanges() {
		predictions = new Map(initialPredictions.map((p) => [p.id, p]));
		hasUnsavedChanges = false;
	}

	return {
		// State
		get predictions() {
			return predictions;
		},
		get hasUnsavedChanges() {
			return hasUnsavedChanges;
		},
		get isSaving() {
			return isSaving;
		},

		// Actions
		updatePrediction,
		submitPrediction,
		isValidPrediction,
		canPredict,
		getPrediction,
		calculatePotentialPoints,
		getStatistics,
		savePredictions,
		resetChanges
	};
}
