<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { authClient, signIn } from '$lib/client/auth-client';
	import { authLoginSchema } from '$lib/validation/auth-schemas';
	import { z } from 'zod';

	// Form state using $state
	let email = $state('');
	let password = $state('');
	let errors = $state<Record<string, string>>({});
	let errorMessage = $state('');
	let isLoading = $state(false);

	// Computed values
	let isFormValid = $derived(
		email.length > 0 && password.length > 0 && Object.keys(errors).length === 0
	);
	let submissionInProgress = $derived(isLoading);

	// Handle input changes
	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const field = target.name;
		const value = target.value;

		// Update the appropriate state variable
		if (field === 'email') email = value;
		if (field === 'password') password = value;

		// Clear error for this field
		if (field in errors) {
			const newErrors = { ...errors };
			delete newErrors[field];
			errors = newErrors;
		}

		console.log(`Field ${field} updated to: ${value}`);
	}

	// Form submission handler
	function onSubmit(e: Event) {
		e.preventDefault();
		errorMessage = '';
		console.log('Form submission started');

		const formData = {
			email,
			password
		};
		console.log('Form data:', formData);

		try {
			// Validate with Zod schema
			console.log('Validating with Zod schema');
			const validatedData = authLoginSchema.parse(formData);
			console.log('Validation successful:', validatedData);

			// Proceed with submission
			isLoading = true;
			console.log('Setting isLoading to true');

			console.log('Calling signIn wrapper function');
			signIn(
				{
					email: validatedData.email,
					password: validatedData.password
				},
				{
					onRequest: () => {
						console.log('Auth request started');
						// Already handled by isLoading state
					},
					onSuccess: () => {
						console.log('Auth successful, redirecting to /predictions');
						goto('/predictions');
					},
					onError: (ctx: { error: { message: string } }) => {
						console.log('Auth error:', ctx.error);
						console.log('Error message:', ctx.error.message);
						errorMessage = ctx.error.message;
						isLoading = false;
						console.log('Setting isLoading to false due to error');
					}
				}
			);
		} catch (error) {
			console.log('Caught error in form validation:', error);
			if (error instanceof z.ZodError) {
				// Update errors object with field-specific errors
				const newErrors: Record<string, string> = {};
				error.errors.forEach((err) => {
					const field = err.path[0] as string;
					newErrors[field] = err.message;
					console.log(`Validation error for ${field}: ${err.message}`);
				});
				errors = newErrors;
				errorMessage = error.errors[0]?.message || 'Invalid form data';
				console.log('Setting error message:', errorMessage);
			} else {
				errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
				console.log('Setting generic error message:', errorMessage);
			}
		}
	}
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
				oninput={handleInput}
				value={email}
				class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
			/>
			{#if errors.email}
				<p class="mt-1 text-sm text-red-500">{errors.email}</p>
			{/if}
		</div>

		<div class="mb-4">
			<label for="password" class="mb-2 block font-medium">Password</label>
			<input
				type="password"
				id="password"
				name="password"
				oninput={handleInput}
				value={password}
				class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
			/>
			{#if errors.password}
				<p class="mt-1 text-sm text-red-500">{errors.password}</p>
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
