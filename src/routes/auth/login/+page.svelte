<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { authLoginSchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';

	const { data } = $props();
	const session = authClient.useSession();

	const { form, errors, enhance, submitting, message } = superForm(data.form, {
		validators: zod(authLoginSchema)
	});

	// Handle Better Auth sign-in directly
	async function handleSignIn(e: Event) {
		e.preventDefault();

		try {
			await authClient.signIn.email(
				{
					email: $form.email,
					password: $form.password,
					rememberMe: true,
					callbackURL: '/predictions'
				},
				{
					onSuccess: () => {
						goto('/predictions');
					},
					onError: (ctx) => {
						// Handle rate limiting specifically
						if (ctx.error.status === 429) {
							const retryAfter = ctx.error.headers?.get('X-Retry-After');
							$message = `Too many login attempts. Please wait ${retryAfter || 60} seconds before trying again.`;
						} else {
							// Use generic error message for security
							// Don't reveal if email exists, is unverified, etc.
							$message = 'Invalid email or password. Please check your credentials and try again.';
						}
						console.error('Sign in error:', ctx.error);
					}
				}
			);
		} catch (error) {
			// Generic error message for any unexpected errors
			$message = 'Login failed. Please try again.';
			console.error('Sign in failed:', error);
		}
	}
</script>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4"
>
	{#if $session.data}
		<div
			class="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 text-center backdrop-blur-sm"
		>
			<div class="mb-6">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600"
				>
					<span class="text-2xl font-bold text-white">ML</span>
				</div>
			</div>
			<h1 class="mb-4 text-2xl font-bold text-white">Welcome back!</h1>
			<p class="mb-6 text-slate-300">Hello, {$session?.data?.user.name}</p>
			<button
				onclick={async () => {
					await authClient.signOut();
				}}
				class="w-full rounded-lg bg-red-600 px-4 py-3 font-medium text-white transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
			>
				Sign Out
			</button>
		</div>
	{:else}
		<div
			class="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 backdrop-blur-sm"
		>
			<div class="mb-8 text-center">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600"
				>
					<span class="text-2xl font-bold text-white">ML</span>
				</div>
				<h1 class="mb-2 text-3xl font-bold text-white">Welcome back</h1>
				<p class="text-slate-400">
					First time here?
					<a href="/auth/signup" class="text-indigo-400 hover:text-indigo-300 hover:underline"
						>Sign up for free</a
					>
				</p>
			</div>

			{#if $message}
				<div class="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
					<p class="text-sm text-red-400">{$message}</p>
				</div>
			{/if}

			<form onsubmit={handleSignIn} class="space-y-6">
				<div>
					<label for="email" class="mb-2 block text-sm font-medium text-slate-300">E-mail</label>
					<input
						type="email"
						id="email"
						name="email"
						bind:value={$form.email}
						class="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
						class:border-red-500={$errors.email}
						autocomplete="email"
						required
					/>
					{#if $errors.email}
						<p class="mt-2 text-sm text-red-400">{$errors.email}</p>
					{/if}
				</div>

				<div>
					<label for="password" class="mb-2 block text-sm font-medium text-slate-300"
						>Password</label
					>
					<input
						type="password"
						id="password"
						name="password"
						bind:value={$form.password}
						class="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
						class:border-red-500={$errors.password}
						autocomplete="current-password"
						required
					/>
					{#if $errors.password}
						<p class="mt-2 text-sm text-red-400">{$errors.password}</p>
					{/if}
				</div>

				<button
					type="submit"
					disabled={$submitting}
					class="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all duration-200 hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if $submitting}
						<div class="flex items-center justify-center">
							<Loader2 class="mr-2 h-5 w-5 animate-spin" />
							Signing in...
						</div>
					{:else}
						Sign in
					{/if}
				</button>
			</form>

			<div class="mt-6 text-center">
				<p class="text-sm text-slate-400">
					<a href="/auth/otp" class="text-indigo-400 hover:text-indigo-300 hover:underline">
						Sign in using magic link
					</a>
				</p>
			</div>
		</div>
	{/if}
</div>
