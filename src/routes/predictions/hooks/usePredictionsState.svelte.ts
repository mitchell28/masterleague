import { invalidate } from '$app/navigation';
import type { Team, Prediction } from '$lib/server/db/schema';
import type { Fixture as BaseFixture } from '$lib/server/db/schema';

// Extended Fixture type with prediction properties
export type PredictionsFixture = BaseFixture & {
	canPredict?: boolean;
	isPastWeek?: boolean;
	isLive?: boolean;
};

// Page data interface
export interface PredictionsPageData {
	fixtures: PredictionsFixture[];
	teams: Record<string, Team>;
	predictions: Record<string, Prediction & { home: number; away: number }>;
	isPastWeek: boolean;
	lastUpdated: string;
	currentWeek: number;
	week: number;
}

// Form result interface
export interface PredictionsFormResult {
	success: boolean;
	message?: string;
	fixtures?: PredictionsFixture[];
	updated?: number;
	live?: number;
	rateLimited?: boolean;
}

// Prediction value type
export type PredictionValue = { home: number; away: number } | null;

/**
 * Main predictions state management hook
 */
export function usePredictionsState(initialData: PredictionsPageData, weekParam: () => string) {
	// Core state using $state with objects for shareability
	const state = $state({
		// Fixtures and predictions
		fixtures: [...(initialData?.fixtures || [])],
		predictionValues: {} as Record<string, PredictionValue>,

		// Current week tracking
		currentDisplayedWeek: initialData?.week || 0,

		// Data tracking - store current data in state
		currentData: initialData,

		// UI state
		submitting: false,
		showSuccess: false,
		showError: false,
		errorMessage: '',
		invalidPredictions: [] as string[],

		// Polling state
		isPolling: false,
		lastPollTime: new Date(),
		isUpdating: false,
		updateFailed: false,
		pollingTimer: null as ReturnType<typeof setTimeout> | null
	});

	// Derived values - now reactive to state.currentData instead of initialData
	const derived = $derived({
		hasLiveFixtures: state.fixtures.some((f) => f.isLive),
		isPastWeek: state.currentData?.isPastWeek || false,
		teams: state.currentData?.teams || {},
		predictions: state.currentData?.predictions || {},
		isCurrentWeek: state.currentData?.currentWeek === parseInt(weekParam()),
		weekParam: weekParam()
	});

	// Initialize component data
	function updateComponentData(data: PredictionsPageData) {
		if (data) {
			// Always update the current data in state
			state.currentData = data;

			// Update fixtures and predictions when week changes or on initial load
			if (data.week !== state.currentDisplayedWeek) {
				state.fixtures = [...(data.fixtures || [])];
				state.currentDisplayedWeek = data.week;

				// Initialize predictions
				initializePredictions(data, data.isPastWeek);
			}
		}
	}

	// Initialize prediction values
	function initializePredictions(data: PredictionsPageData, isPastWeek: boolean) {
		if (!state.fixtures.length) return;

		const newPredictions: Record<string, PredictionValue> = {};

		// Initialize from existing predictions
		for (const fixtureId in data.predictions) {
			const prediction = data.predictions[fixtureId];
			if (prediction) {
				newPredictions[fixtureId] = {
					home: prediction.home,
					away: prediction.away
				};
			}
		}

		// Initialize new predictions for predictable fixtures
		for (const fixture of state.fixtures) {
			if (newPredictions[fixture.id]) continue;

			if (isPastWeek || !fixture.canPredict) {
				newPredictions[fixture.id] = null;
			} else if (fixture.canPredict) {
				newPredictions[fixture.id] = { home: 0, away: 0 };
			}
		}

		state.predictionValues = newPredictions;
	}

	// Initialize predictions on first load
	if (initialData) {
		initializePredictions(initialData, initialData.isPastWeek);
	}

	// Update individual prediction
	function updatePrediction(fixtureId: string, home: number, away: number): void {
		if (state.predictionValues[fixtureId]) {
			state.predictionValues[fixtureId] = { home, away };
		}
	}

	// Handle form fixture updates
	function handleFormFixtures(formFixtures: PredictionsFixture[]) {
		if (formFixtures && formFixtures.length > 0) {
			state.fixtures = [...formFixtures];
			state.lastPollTime = new Date();
		}
	}

	// Reset UI states
	function resetUIStates() {
		state.showSuccess = false;
		state.showError = false;
		state.errorMessage = '';
		state.invalidPredictions = [];
	}

	// Show success message
	function showSuccessMessage() {
		state.showSuccess = true;
		setTimeout(() => {
			state.showSuccess = false;
		}, 3000);
	}

	// Show error message
	function showErrorMessage(message: string) {
		state.showError = true;
		state.errorMessage = message;
		setTimeout(() => {
			state.showError = false;
		}, 5000);
	}

	return {
		// State
		state,
		get derived() {
			return derived;
		},

		// Actions
		updateComponentData,
		updatePrediction,
		handleFormFixtures,
		resetUIStates,
		showSuccessMessage,
		showErrorMessage
	};
}
