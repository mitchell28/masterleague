/**
 * Hook for managing prediction form submission and validation
 * Handles form state, submission, and error handling
 */
export function usePredictionForm() {
	// Form handling and UI state
	let submitting = $state(false);
	let showSuccess = $state(false);
	let showError = $state(false);
	let errorMessage = $state('');
	let invalidPredictions = $state<string[]>([]);

	// Clear success/error states after delay
	function clearMessages() {
		setTimeout(() => {
			showSuccess = false;
			showError = false;
			errorMessage = '';
		}, 3000);
	}

	// Handle form submission start
	function handleSubmissionStart() {
		submitting = true;
		showSuccess = false;
		showError = false;
		errorMessage = '';
		invalidPredictions = [];
	}

	// Handle form submission success
	function handleSubmissionSuccess(message?: string) {
		submitting = false;
		showSuccess = true;
		errorMessage = message || 'Predictions saved successfully!';
		clearMessages();
	}

	// Handle form submission error
	function handleSubmissionError(error: string, invalid: string[] = []) {
		submitting = false;
		showError = true;
		errorMessage = error;
		invalidPredictions = invalid;
		clearMessages();
	}

	// Handle rate limiting
	function handleRateLimit() {
		handleSubmissionError('Too many requests. Please wait before submitting again.');
	}

	// Validate prediction values
	function validatePredictions(
		predictionValues: Record<string, { home: number; away: number } | null>
	) {
		const invalid: string[] = [];

		for (const [fixtureId, prediction] of Object.entries(predictionValues)) {
			if (prediction && (prediction.home < 0 || prediction.away < 0)) {
				invalid.push(fixtureId);
			}
		}

		return invalid;
	}

	// Form enhancement function for SvelteKit
	function enhanceForm() {
		return ({ formData, cancel }: { formData: FormData; cancel: () => void }) => {
			handleSubmissionStart();

			return async ({ result }: { result: any }) => {
				if (result.type === 'success') {
					handleSubmissionSuccess(result.data?.message);
				} else if (result.type === 'error') {
					handleSubmissionError(result.error?.message || 'An error occurred');
				} else if (result.type === 'failure') {
					if (result.data?.rateLimited) {
						handleRateLimit();
					} else {
						const invalid = result.data?.invalidPredictions || [];
						handleSubmissionError(result.data?.message || 'Validation failed', invalid);
					}
				}
			};
		};
	}

	return {
		// State
		get submitting() {
			return submitting;
		},
		get showSuccess() {
			return showSuccess;
		},
		get showError() {
			return showError;
		},
		get errorMessage() {
			return errorMessage;
		},
		get invalidPredictions() {
			return invalidPredictions;
		},

		// Methods
		handleSubmissionStart,
		handleSubmissionSuccess,
		handleSubmissionError,
		handleRateLimit,
		validatePredictions,
		enhanceForm,
		clearMessages
	};
}
