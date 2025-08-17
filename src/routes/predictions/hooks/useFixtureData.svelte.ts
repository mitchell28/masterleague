import type { Team, Prediction } from '$lib/server/db/schema';
import type { Fixture as BaseFixture } from '$lib/server/db/schema';

// Extended Fixture type with canPredict property
type Fixture = BaseFixture & {
	canPredict?: boolean;
	isPastWeek?: boolean;
	isLive?: boolean;
};

/**
 * Hook for managing fixture data and prediction state
 * Handles fixtures, predictions, and derived states
 */
export function useFixtureData(
	initialData: () => {
		fixtures?: Fixture[];
		teams?: Record<string, Team>;
		predictions?: Record<string, Prediction & { home: number; away: number }>;
		isPastWeek?: boolean;
		week?: number;
	}
) {
	// Local state for fixtures and predictions
	let localFixtures = $state<Fixture[]>([]);
	let predictionValues = $state<Record<string, { home: number; away: number } | null>>({});
	let currentDisplayedWeek = $state(0);

	// Derived states
	const hasLiveFixtures = $derived(localFixtures.some((f) => f.isLive));
	const isPastWeek = $derived(initialData()?.isPastWeek || false);
	const teams = $derived(initialData()?.teams || {});
	const predictions = $derived(initialData()?.predictions || {});

	// Initialize predictions for fixtures
	function initializePredictions() {
		const data = initialData();

		// Skip if no fixtures
		if (!localFixtures.length) return;

		const newPredictions: Record<string, { home: number; away: number } | null> = {};

		// Initialize values from existing predictions
		for (const fixtureId in predictions) {
			const prediction = predictions[fixtureId];
			if (prediction) {
				newPredictions[fixtureId] = {
					home: prediction.home,
					away: prediction.away
				};
			}
		}

		// Initialize new predictions only for fixtures that can be predicted
		for (const fixture of localFixtures) {
			// Skip if we already have a prediction
			if (newPredictions[fixture.id]) continue;

			// For past weeks or fixtures that can't be predicted, set null
			if (isPastWeek || !fixture.canPredict) {
				newPredictions[fixture.id] = null;
			}
			// For predictable fixtures in current/future weeks, initialize with zeros
			else if (fixture.canPredict) {
				newPredictions[fixture.id] = { home: 0, away: 0 };
			}
		}

		// Set all at once to minimize reactivity triggers
		predictionValues = newPredictions;
	}

	// Update component data when week changes
	function updateComponentData() {
		const data = initialData();

		// Update fixtures from data
		if (data?.fixtures) {
			localFixtures = [...data.fixtures];
			currentDisplayedWeek = data.week || 0;

			// Update predictions
			initializePredictions();
		}
	}

	// Handle form fixture updates
	function handleFormUpdates(formFixtures: Fixture[]) {
		if (formFixtures && formFixtures.length > 0) {
			// Replace fixtures with form data
			localFixtures = [...formFixtures];
		}
	}

	// Update prediction value for a specific fixture
	function updatePrediction(fixtureId: string, prediction: { home: number; away: number }) {
		predictionValues = {
			...predictionValues,
			[fixtureId]: prediction
		};
	}

	// Get prediction for a fixture
	function getPrediction(fixtureId: string) {
		return predictionValues[fixtureId] || null;
	}

	// Check if fixture has prediction
	function hasPrediction(fixtureId: string) {
		const prediction = predictionValues[fixtureId];
		return prediction !== null && prediction !== undefined;
	}

	return {
		// State
		get localFixtures() {
			return localFixtures;
		},
		get predictionValues() {
			return predictionValues;
		},
		get currentDisplayedWeek() {
			return currentDisplayedWeek;
		},
		get hasLiveFixtures() {
			return hasLiveFixtures;
		},
		get isPastWeek() {
			return isPastWeek;
		},
		get teams() {
			return teams;
		},
		get predictions() {
			return predictions;
		},

		// Methods
		initializePredictions,
		updateComponentData,
		handleFormUpdates,
		updatePrediction,
		getPrediction,
		hasPrediction
	};
}
