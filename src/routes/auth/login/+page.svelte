<script lang="ts">
	import { goto } from '$app/navigation';
	import { signIn } from '$lib/client/auth-client';
	import { authLoginSchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';
	import { z } from 'zod';

	// Form state using runes
	let email: string = $state('');
	let password: string = $state('');
	let errors: Record<string, string> = $state({});
	let errorMessage: string = $state('');
	let isLoading: boolean = $state(false);
	let { redirectPath } = $props();

	// Computed values with $derived
	let isFormValid = $derived(
		email.length > 0 && password.length > 0 && Object.keys(errors).length === 0
	);

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
	}

	// Form submission handler
	async function onSubmit(e: Event) {
		e.preventDefault();
		errorMessage = '';

		const formData = {
			email,
			password
		};

		try {
			// Validate with Zod schema
			const validatedData = authLoginSchema.parse(formData);

			// Proceed with submission
			isLoading = true;

			await signIn(
				{
					email: validatedData.email,
					password: validatedData.password
				},
				{
					onSuccess: () => {
						goto(redirectPath || '/predictions');
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
			}
			isLoading = false;
		}
	}
</script>

<div class="mx-auto max-w-md p-8">
	<h1 class="mb-8 text-center text-2xl font-bold">Login</h1>

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
				autocomplete="current-password"
			/>
			{#if errors.password}
				<p class="mt-1 text-sm text-red-500">{errors.password}</p>
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
					<Loader2 class="mr-2 h-5 w-5 animate-spin text-white" />Logging in...
				</div>
			{:else}
				Login
			{/if}
		</button>
	</form>

	<p class="mt-6 text-center">
		Don't have an account? <a
			href="/auth/signup"
			class="text-indigo-600 hover:text-indigo-800 hover:underline">Sign up</a
		>
	</p>
</div>
