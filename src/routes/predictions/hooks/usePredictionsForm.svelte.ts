import type { PredictionsFormResult } from './usePredictionsState.svelte';
import { usePredictionsValidation } from './usePredictionsValidation.svelte';

/**
 * Hook for handling prediction form submissions
 */
export function usePredictionsForm(
	state: any,
	showSuccessMessage: () => void,
	showErrorMessage: (message: string) => void
) {
	const validation = usePredictionsValidation();

	// Form submission handler
	function handleSubmit() {
		state.submitting = true;

		// Validate before submitting
		const { isValid, invalidPredictions } = validation.validateForm(
			state.fixtures,
			state.predictionValues
		);

		if (!isValid) {
			state.submitting = false;
			state.invalidPredictions = invalidPredictions;
			const errorMsg = validation.getValidationErrorMessage(invalidPredictions.length);
			showErrorMessage(errorMsg);
			return;
		}

		// Clear any previous validation errors
		state.invalidPredictions = [];

		// Return processing function for after submission
		return async ({
			result
		}: {
			result: {
				type: string;
				data?: { message: string };
			};
		}) => {
			state.submitting = false;

			if (result.type === 'success') {
				showSuccessMessage();
			} else if (result.type === 'failure') {
				const errorMsg = result.data?.message || 'Failed to save predictions';
				showErrorMessage(errorMsg);
			}
		};
	}

	// Handle form result updates (from server actions)
	function handleFormResult(form: PredictionsFormResult | undefined) {
		if (!form) return;

		// Handle fixture updates from form
		if (form.fixtures && form.fixtures.length > 0) {
			state.fixtures = [...form.fixtures];
			state.lastPollTime = new Date();
		}

		// Handle success/error states
		if (form.success && form.message) {
			showSuccessMessage();
		} else if (!form.success && form.message) {
			showErrorMessage(form.message);
		}

		// Handle rate limiting
		if (form.rateLimited) {
			showErrorMessage('Too many requests. Please wait before updating again.');
		}
	}

	// Check if prediction is invalid for styling
	function isPredictionInvalid(fixtureId: string): boolean {
		return state.invalidPredictions.includes(fixtureId);
	}

	// Check if form can be submitted
	function canSubmitForm(): boolean {
		return (
			!state.submitting &&
			state.fixtures.some((f: any) => f.canPredict) &&
			!state.invalidPredictions.length
		);
	}

	return {
		handleSubmit,
		handleFormResult,
		isPredictionInvalid,
		canSubmitForm
	};
}
