import { onDestroy } from 'svelte';
import { page } from '$app/state';
import { usePredictionsState } from './usePredictionsState.svelte.js';
import { usePredictionsPolling } from './usePredictionsPolling.svelte.js';
import { usePredictionsForm } from './usePredictionsForm.svelte.js';
import type { PredictionsPageData, PredictionsFormResult } from './usePredictionsState.svelte.js';

/**
 * Main hook that orchestrates all prediction functionality
 */
export function usePredictions(initialData: PredictionsPageData, form?: PredictionsFormResult) {
	// Get week parameter - this will be reactive
	const weekParam = $derived(page.params.week);

	// Create a derived value that we can access safely
	const currentWeek = $derived(weekParam || '1');

	// Initialize hooks with initial values - pass functions for lazy evaluation
	const predictions = usePredictionsState(initialData, () => currentWeek);
	const { state } = predictions;

	const polling = usePredictionsPolling(state, predictions.derived, () => currentWeek);
	const formHandling = usePredictionsForm(
		state,
		predictions.showSuccessMessage,
		predictions.showErrorMessage
	);

	// Handle form result updates
	$effect(() => {
		if (formHandling && form) {
			formHandling.handleFormResult(form);
		}
	});

	// Update polling state when conditions change
	$effect(() => {
		if (polling) {
			polling.updatePollingState();
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (polling) {
			polling.cleanup();
		}
	});

	// Export all functionality
	return {
		// State
		state,
		get derived() {
			return predictions.derived;
		},

		// Prediction management
		updatePrediction: predictions.updatePrediction,
		updateComponentData: predictions.updateComponentData,

		// Form handling
		handleSubmit: formHandling.handleSubmit,
		isPredictionInvalid: formHandling.isPredictionInvalid,
		canSubmitForm: formHandling.canSubmitForm,

		// Polling
		manualRefresh: polling.manualRefresh,

		// UI helpers
		resetUIStates: predictions.resetUIStates,
		showSuccessMessage: predictions.showSuccessMessage,
		showErrorMessage: predictions.showErrorMessage
	};
}
