<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import { createFormValidator, handleInput } from '$lib/validation/formValidation';
	import { authLoginSchema } from '$lib/validation/auth-schemas';

	// Form state using $state rune
	let errorMessage = $state('');
	let isLoading = $state(false);

	// Create form validator
	const { formData, errors, isSubmitting, isValid, updateField } = createFormValidator(
		authLoginSchema,
		{
			email: '',
			password: ''
		}
	);

	// Handle form input changes
	const handleFormInput = handleInput(updateField);

	// Computed values using $derived rune
	let isFormValid = $derived($isValid);
	let submissionInProgress = $derived($isSubmitting || isLoading);

	// Custom form submission handler
	function onSubmit(e: Event) {
		e.preventDefault();
		// Validate form data
		try {
			const validatedData = authLoginSchema.parse($formData);

			// Proceed with submission
			isLoading = true;
			errorMessage = '';

			authClient.signIn
				.email(
					{
						email: validatedData.email, // Using email as email
						password: validatedData.password
					},
					{
						onRequest: () => {
							// Already handled by isLoading state
						},
						onSuccess: () => {
							goto('/dashboard');
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
		} catch (error) {
			if (error instanceof Error) {
				errorMessage = error.message;
			} else {
				errorMessage = 'Invalid form data';
			}
		}
	}

	// Track validation errors with $effect
	$effect(() => {
		if ($errors.form) {
			errorMessage = $errors.form;
		}
	});
</script>

<div class="mx-auto max-w-md p-8">
	<h1 class="mb-8 text-center text-2xl font-bold">Login</h1>

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

		{#if errorMessage}
			<p class="mb-4 text-sm text-red-500">{errorMessage}</p>
		{/if}

		<button
			type="submit"
			disabled={submissionInProgress || !isFormValid}
			class="mb-4 w-full rounded-md bg-indigo-600 px-3 py-3 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400"
		>
			{submissionInProgress ? 'Logging in...' : 'Login'}
		</button>
	</form>

	<p class="mt-6 text-center">
		Don't have an account? <a href="/auth/signup" class="text-indigo-600 hover:text-indigo-800"
			>Sign up</a
		>
	</p>
</div>
