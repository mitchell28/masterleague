<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import { createFormValidator, handleInput } from '$lib/validation/formValidation';
	import { authRegisterSchema, validateRegisterData } from '$lib/validation/auth-schemas';

	// Form state using $state
	let errorMessage = $state('');
	let isLoading = $state(false);
	let passwordsMatch = $state(true);

	// Create form validator
	const { formData, errors, isSubmitting, isValid, updateField } = createFormValidator(
		authRegisterSchema,
		{
			email: '',
			password: '',
			confirmPassword: ''
		}
	);

	// Handle form input changes
	const handleFormInput = handleInput((field, value) => {
		updateField(field, value);

		// Check password match when either password field changes
		if (field === 'password' || field === 'confirmPassword') {
			checkPasswordsMatch();
		}
	});

	// Check if passwords match
	function checkPasswordsMatch() {
		const currentFormData = { ...$formData };
		passwordsMatch = currentFormData.password === currentFormData.confirmPassword;
		if (!passwordsMatch && currentFormData.confirmPassword) {
			errors.update((e) => ({ ...e, confirmPassword: "Passwords don't match" }));
		} else if (passwordsMatch && currentFormData.confirmPassword) {
			errors.update((e) => {
				const newErrors = { ...e };
				delete newErrors.confirmPassword;
				return newErrors;
			});
		}
	}

	// Computed values using $derived
	let isFormValid = $derived($isValid && passwordsMatch);
	let submissionInProgress = $derived($isSubmitting || isLoading);

	// Custom form submission handler
	function onSubmit(e: Event) {
		e.preventDefault();
		// Validate form data manually
		const validationResult = validateRegisterData($formData);

		if (!validationResult.success) {
			errorMessage = validationResult.error || 'Invalid form data';
			return;
		}

		// If validation passes, proceed with submission
		isLoading = true;

		authClient.signUp
			.email(
				{
					email: validationResult.data!.email, // Using email as email
					password: validationResult.data!.password,
					name: validationResult.data!.email, // Using email as name
					callbackURL: '/predictions' // Redirect after email verification (if required)
				},
				{
					onRequest: () => {
						// Already handled by isLoading state
					},
					onSuccess: () => {
						goto('/predictions'); // Redirect to dashboard if autoSignIn is true
					},
					onError: (ctx: { error: { message: string } }) => {
						errorMessage = ctx.error.message;
						isLoading = false;
					}
				}
			)
			.catch((error: unknown) => {
				errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
				isLoading = false;
			});
	}

	// Track validation errors with $effect
	$effect(() => {
		if ($errors.form) {
			errorMessage = $errors.form;
		}
	});
</script>

<div class="mx-auto max-w-md p-8">
	<h1 class="mb-8 text-center text-2xl font-bold">Create an Account</h1>

	<form onsubmit={onSubmit}>
		<div class="mb-4">
			<label for="email" class="mb-2 block font-medium">Email</label>
			<input
				type="text"
				id="email"
				name="email"
				oninput={handleFormInput}
				value={$formData.email || ''}
				class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
			/>
			{#if $errors.email}
				<p class="mt-1 text-sm text-red-500">{$errors.email}</p>
			{/if}
		</div>

		<div class="mb-4">
			<label for="password" class="mb-2 block font-medium">Password</label>
			<input
				type="password"
				id="password"
				name="password"
				oninput={handleFormInput}
				value={$formData.password || ''}
				class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
			/>
			{#if $errors.password}
				<p class="mt-1 text-sm text-red-500">{$errors.password}</p>
			{/if}
		</div>

		<div class="mb-4">
			<label for="confirmPassword" class="mb-2 block font-medium">Confirm Password</label>
			<input
				type="password"
				id="confirmPassword"
				name="confirmPassword"
				oninput={handleFormInput}
				value={$formData.confirmPassword || ''}
				class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
			/>
			{#if $errors.confirmPassword}
				<p class="mt-1 text-sm text-red-500">{$errors.confirmPassword}</p>
			{/if}
		</div>

		{#if errorMessage}
			<p class="mb-4 text-sm text-red-500">{errorMessage}</p>
		{/if}

		<button
			type="submit"
			disabled={submissionInProgress || !isFormValid}
			class="mb-4 w-full rounded-md bg-indigo-600 px-3 py-3 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400"
		>
			{submissionInProgress ? 'Creating Account...' : 'Sign Up'}
		</button>
	</form>

	<p class="mt-6 text-center">
		Already have an account? <a href="/auth/login" class="text-indigo-600 hover:text-indigo-800"
			>Login</a
		>
	</p>
</div>
