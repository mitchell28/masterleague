<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { authSignupSchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';

	const { data } = $props();
	const session = authClient.useSession();

	const { form, errors, enhance, submitting, message } = superForm(data.form, {
		validators: zod(authSignupSchema)
	});

	// Handle Better Auth sign-up directly
	async function handleSignUp(e: Event) {
		e.preventDefault();

		try {
			await authClient.signUp.email(
				{
					name: $form.username, // Better Auth expects 'name' field
					username: $form.username,
					email: $form.email,
					password: $form.password,
					callbackURL: '/auth/verify-email'
				},
				{
					onSuccess: () => {
						// With OTP verification enabled, redirect to verification page
						goto(`/auth/verify-email?email=${encodeURIComponent($form.email)}`);
					},
					onError: (ctx) => {
						console.error('Sign up error:', ctx.error);
					}
				}
			);
		} catch (error) {
			console.error('Sign up failed:', error);
		}
	}
</script>

<div class="mx-auto max-w-md p-8">
	{#if $session.data}
		<div class="text-center">
			<h1 class="mb-4 text-2xl font-bold">Welcome!</h1>
			<p class="mb-4">Hello, {$session?.data?.user.name}</p>
			<p class="mb-4">You're already signed in.</p>
			<button
				onclick={() => goto('/predictions')}
				class="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
			>
				Go to Predictions
			</button>
		</div>
	{:else}
		<h1 class="mb-8 text-center text-2xl font-bold">Create Account</h1>

		{#if $message}
			<div class="mb-4 rounded-md bg-red-50 p-3">
				<p class="text-sm text-red-700">{$message}</p>
			</div>
		{/if}

		<form onsubmit={handleSignUp}>
			<div class="mb-4">
				<label for="username" class="mb-2 block font-medium">Username</label>
				<input
					type="text"
					id="username"
					name="username"
					bind:value={$form.username}
					class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
					class:border-red-500={$errors.username}
					autocomplete="username"
					required
				/>
				{#if $errors.username}
					<p class="mt-1 text-sm text-red-500">{$errors.username}</p>
				{/if}
			</div>

			<div class="mb-4">
				<label for="email" class="mb-2 block font-medium">Email</label>
				<input
					type="email"
					id="email"
					name="email"
					bind:value={$form.email}
					class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
					class:border-red-500={$errors.email}
					autocomplete="email"
					required
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
					bind:value={$form.password}
					class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
					class:border-red-500={$errors.password}
					autocomplete="new-password"
					required
				/>
				{#if $errors.password}
					<p class="mt-1 text-sm text-red-500">{$errors.password}</p>
				{/if}
			</div>

			<button
				type="submit"
				disabled={$submitting}
				class="mb-4 w-full rounded-md bg-indigo-600 px-3 py-3 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
			>
				{#if $submitting}
					<div class="flex items-center justify-center">
						<Loader2 class="mr-2 h-5 w-5 animate-spin text-white" />
						Creating Account...
					</div>
				{:else}
					Create Account
				{/if}
			</button>
		</form>

		<p class="mt-6 text-center">
			Already have an account? <a
				href="/auth/login"
				class="text-indigo-600 hover:text-indigo-800 hover:underline">Sign in</a
			>
		</p>
	{/if}
</div>
