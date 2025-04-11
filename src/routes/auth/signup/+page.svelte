<script lang="ts">
	import { goto } from '$app/navigation';
	import { authRegisterSchema } from '$lib/validation/auth-schemas';
	import { signUp } from '$lib/client/auth-client';
	import { z } from 'zod';
	import { Loader2 } from '@lucide/svelte';

	// Form state using runes
	let email: string = $state('');
	let password: string = $state('');
	let confirmPassword: string = $state('');
	let errors: Record<string, string> = $state({});
	let errorMessage: string = $state('');
	let isLoading: boolean = $state(false);

	// Computed values with $derived
	let passwordsMatch = $derived(password === confirmPassword);
	let isFormValid = $derived(
		email.length > 0 &&
			password.length >= 8 &&
			confirmPassword.length > 0 &&
			passwordsMatch &&
			Object.keys(errors).length === 0
	);

	// Handle input changes
	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const field = target.name;
		const value = target.value;

		// Update the appropriate state variable
		if (field === 'email') email = value;
		if (field === 'password') password = value;
		if (field === 'confirmPassword') confirmPassword = value;

		// Clear error for this field
		if (field in errors) {
			const newErrors = { ...errors };
			delete newErrors[field];
			errors = newErrors;
		}

		// Validate password match if relevant fields changed
		if (field === 'password' || field === 'confirmPassword') {
			validatePasswordMatch();
		}
	}

	// Check if passwords match
	function validatePasswordMatch() {
		if (!passwordsMatch && confirmPassword) {
			errors = { ...errors, confirmPassword: "Passwords don't match" };
		} else if (
			passwordsMatch &&
			confirmPassword &&
			errors.confirmPassword === "Passwords don't match"
		) {
			const newErrors = { ...errors };
			delete newErrors.confirmPassword;
			errors = newErrors;
		}
	}

	// Form submission handler
	async function onSubmit(e: Event) {
		e.preventDefault();
		errorMessage = '';

		const formData = {
			email,
			password,
			confirmPassword
		};

		try {
			// Validate with Zod schema
			const result = authRegisterSchema.parse(formData);

			// Also check password match
			if (result.password !== result.confirmPassword) {
				errorMessage = "Passwords don't match";
				return;
			}

			// If validation passes, proceed with submission
			isLoading = true;

			await signUp(
				{
					email: result.email,
					password: result.password,
					name: result.email,
					callbackURL: '/predictions'
				},
				{
					onSuccess: () => {
						try {
							goto('/predictions');
						} catch (navError) {
							console.error('Navigation error:', navError);
							// Make sure we reset loading state if navigation fails
							isLoading = false;
						}
					},
					onError: (ctx) => {
						errorMessage = ctx.error.message;
						isLoading = false;
					}
				}
			);
		} catch (error) {
			if (error instanceof z.ZodError) {
				// Update errors object with field-specific errors
				const newErrors: Record<string, string> = {};
				error.errors.forEach((err) => {
					const field = err.path[0] as string;
					newErrors[field] = err.message;
				});
				errors = newErrors;
				errorMessage = error.errors[0]?.message || 'Invalid form data';
			} else {
				errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
				isLoading = false;
			}
		}
	}
</script>

<div class="mx-auto max-w-md p-8">
	<h1 class="mb-8 text-center text-2xl font-bold">Create an Account</h1>

	<form onsubmit={onSubmit}>
		<div class="mb-4">
			<label for="email" class="mb-2 block font-medium">Email</label>
			<input
				type="email"
				id="email"
				name="email"
				oninput={handleInput}
				value={email}
				class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
				autocomplete="email"
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
				autocomplete="new-password"
			/>
			{#if errors.password}
				<p class="mt-1 text-sm text-red-500">{errors.password}</p>
			{/if}
		</div>

		<div class="mb-4">
			<label for="confirmPassword" class="mb-2 block font-medium">Confirm Password</label>
			<input
				type="password"
				id="confirmPassword"
				name="confirmPassword"
				oninput={handleInput}
				value={confirmPassword}
				class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
				autocomplete="new-password"
			/>
			{#if errors.confirmPassword}
				<p class="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
			{/if}
		</div>

		{#if errorMessage}
			<div class="mb-4 rounded-md bg-red-50 p-3">
				<p class="text-sm text-red-700">{errorMessage}</p>
			</div>
		{/if}

		<button
			type="submit"
			disabled={isLoading || !isFormValid}
			class="mb-4 w-full rounded-md bg-indigo-600 px-3 py-3 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
		>
			{#if isLoading}
				<div class="flex items-center justify-center">
					<Loader2 class="mr-2 h-5 w-5 animate-spin text-white" />
					Creating Account...
				</div>
			{:else}
				Sign Up
			{/if}
		</button>
	</form>

	<p class="mt-6 text-center">
		Already have an account? <a
			href="/auth/login"
			class="text-indigo-600 hover:text-indigo-800 hover:underline">Login</a
		>
	</p>
</div>
