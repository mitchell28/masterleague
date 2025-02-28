import { z } from 'zod';
import { writable, type Writable } from 'svelte/store';

type ValidationErrors = Record<string, string>;
type FormData = Record<string, unknown>;

/**
 * Creates a form validation store with helper functions
 * @param schema The Zod schema to validate against
 * @param initialData Initial form data
 */
export function createFormValidator<T extends z.AnyZodObject>(
	schema: T,
	initialData: FormData = {}
) {
	// Create stores for form data and errors
	const formData: Writable<FormData> = writable(initialData);
	const errors: Writable<ValidationErrors> = writable({});
	const isSubmitting: Writable<boolean> = writable(false);
	const isValid: Writable<boolean> = writable(false);

	// Validate the entire form
	function validateForm(data: FormData): {
		success: boolean;
		data?: z.infer<T>;
		errors?: ValidationErrors;
	} {
		try {
			const validatedData = schema.parse(data);
			errors.set({});
			isValid.set(true);
			return { success: true, data: validatedData };
		} catch (error) {
			if (error instanceof z.ZodError) {
				const formattedErrors: ValidationErrors = {};

				error.errors.forEach((err) => {
					const path = err.path.join('.');
					formattedErrors[path] = err.message;
				});

				errors.set(formattedErrors);
				isValid.set(false);
				return { success: false, errors: formattedErrors };
			}

			// Unknown error
			errors.set({ form: 'An unexpected error occurred' });
			isValid.set(false);
			return { success: false, errors: { form: 'An unexpected error occurred' } };
		}
	}

	// Validate a single field
	function validateField(field: string, value: unknown): string | null {
		try {
			// Create a partial schema for just this field
			const partialData = { [field]: value };

			// Try to parse just this field
			schema.pick({ [field]: true }).parse(partialData);

			// Clear the error for this field
			errors.update((currentErrors) => {
				const newErrors = { ...currentErrors };
				delete newErrors[field];
				return newErrors;
			});

			// Check if the form is now valid
			formData.update((data) => {
				const updatedData = { ...data, [field]: value };
				const validationResult = validateForm(updatedData);
				isValid.set(validationResult.success);
				return updatedData;
			});

			return null;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const fieldError = error.errors[0]?.message || 'Invalid value';

				// Update errors store
				errors.update((currentErrors) => ({
					...currentErrors,
					[field]: fieldError
				}));

				isValid.set(false);
				return fieldError;
			}

			return 'Invalid value';
		}
	}

	// Handle form submission
	async function handleSubmit(
		submitFn: (data: z.infer<T>) => Promise<any>,
		options: {
			onSuccess?: (result: any) => void;
			onError?: (error: any) => void;
		} = {}
	) {
		// Get the current form data
		let currentData: FormData = {};
		formData.update((data) => {
			currentData = data;
			return data;
		});

		const validationResult = validateForm(currentData);

		if (!validationResult.success) {
			return false;
		}

		try {
			isSubmitting.set(true);
			const result = await submitFn(validationResult.data as z.infer<T>);

			if (options.onSuccess) {
				options.onSuccess(result);
			}

			return true;
		} catch (error) {
			if (options.onError) {
				options.onError(error);
			}

			// Handle validation errors from API
			if (error && typeof error === 'object' && 'errors' in error) {
				const apiErrors = (error as any).errors as Array<{ path: string; message: string }>;
				const formattedErrors: ValidationErrors = {};

				apiErrors.forEach((err) => {
					formattedErrors[err.path] = err.message;
				});

				errors.set(formattedErrors);
			}

			return false;
		} finally {
			isSubmitting.set(false);
		}
	}

	// Reset form to initial values
	function resetForm() {
		formData.set(initialData);
		errors.set({});
		isValid.set(false);
	}

	// Update a field value
	function updateField(field: string, value: unknown) {
		formData.update((data) => {
			const updatedData = { ...data, [field]: value };
			return updatedData;
		});

		validateField(field, value);
	}

	return {
		formData,
		errors,
		isSubmitting,
		isValid,
		validateForm,
		validateField,
		handleSubmit,
		resetForm,
		updateField
	};
}

/**
 * Helper function to handle form inputs with validation
 */
export function handleInput(updateFn: (field: string, value: unknown) => void) {
	return (e: Event) => {
		const target = e.target as HTMLInputElement;
		const field = target.name;
		const value = target.type === 'checkbox' ? target.checked : target.value;

		if (!field) {
			console.error('Input is missing a name attribute');
			return;
		}

		updateFn(field, value);
	};
}
