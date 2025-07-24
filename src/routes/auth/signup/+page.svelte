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

	// Username suggestions state
	let usernameTaken = $state(false);
	let usernameSuggestions = $state<string[]>([]);
	let checkingUsername = $state(false);
	let debounceTimer: NodeJS.Timeout | null = null;

	// Generate username suggestions
	function generateUsernameSuggestions(baseUsername: string): string[] {
		const suggestions = [];
		const random = Math.floor(Math.random() * 999) + 1;

		suggestions.push(`${baseUsername}${random}`);
		suggestions.push(`${baseUsername}_${Math.floor(Math.random() * 99) + 1}`);
		suggestions.push(`${baseUsername}${new Date().getFullYear()}`);

		return suggestions;
	}

	// Check username availability
	async function checkUsernameAvailability(username: string) {
		if (!username || username.length < 3) return;

		checkingUsername = true;
		usernameTaken = false;
		usernameSuggestions = [];

		try {
			// Use Better Auth to check if username exists
			const response = await fetch('/api/check-username', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username })
			});

			if (response.ok) {
				const result = await response.json();
				if (result.taken) {
					usernameTaken = true;
					usernameSuggestions = generateUsernameSuggestions(username);
				}
			}
		} catch (error) {
			console.error('Username check failed:', error);
		} finally {
			checkingUsername = false;
		}
	}

	// Select suggested username
	function selectSuggestion(suggestion: string) {
		$form.username = suggestion;
		usernameTaken = false;
		usernameSuggestions = [];
	}

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

						// Handle rate limiting specifically
						if (ctx.error.status === 429) {
							const retryAfter = ctx.error.headers?.get('X-Retry-After');
							$message = `Too many signup attempts. Please wait ${retryAfter || 60} seconds before trying again.`;
						} else if (
							ctx.error.message?.toLowerCase().includes('username') ||
							ctx.error.message?.toLowerCase().includes('unique constraint') ||
							ctx.error.status === 409
						) {
							// Username conflict - show suggestions
							usernameTaken = true;
							usernameSuggestions = generateUsernameSuggestions($form.username);
							$message = 'Username is already taken. Try one of the suggestions below.';
						} else if (
							ctx.error.message?.toLowerCase().includes('email') &&
							(ctx.error.message?.toLowerCase().includes('already exists') ||
								ctx.error.message?.toLowerCase().includes('duplicate'))
						) {
							$message = 'An account with this email already exists. Please sign in instead.';
						} else {
							// Generic error - but also check if it might be a username issue
							$message = `Account creation failed: ${ctx.error.message || 'Please try again.'}`;
						}
					}
				}
			);
		} catch (error) {
			$message = 'Account creation failed. Please try again.';
			console.error('Sign up failed:', error);
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
			<h1 class="mb-4 text-2xl font-bold text-white">Welcome!</h1>
			<p class="mb-4 text-slate-300">Hello, {$session?.data?.user.name}</p>
			<p class="mb-6 text-slate-400">You're already signed in.</p>
			<button
				onclick={() => goto('/predictions')}
				class="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all duration-200 hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
			>
				Go to Predictions
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
				<h1 class="mb-2 text-3xl font-bold text-white">Create Account</h1>
				<p class="text-slate-400">
					Already have an account?
					<a href="/auth/login" class="text-indigo-400 hover:text-indigo-300 hover:underline"
						>Sign in</a
					>
				</p>
			</div>

			{#if $message}
				<div class="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
					<p class="text-sm text-red-400">{$message}</p>
				</div>
			{/if}

			<form onsubmit={handleSignUp} use:enhance class="space-y-6">
				<div>
					<label for="username" class="mb-2 block text-sm font-medium text-slate-300"
						>Username</label
					>
					<input
						type="text"
						id="username"
						name="username"
						bind:value={$form.username}
						oninput={(e) => {
							const target = e.target as HTMLInputElement;
							const username = target?.value || '';

							// Clear previous timeout (debouncing)
							if (debounceTimer) {
								clearTimeout(debounceTimer);
							}

							if (username.length >= 3) {
								// Set new timeout
								debounceTimer = setTimeout(() => checkUsernameAvailability(username), 500);
							} else {
								usernameTaken = false;
								usernameSuggestions = [];
								checkingUsername = false;
							}
						}}
						class="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
						class:border-red-500={$errors.username || usernameTaken}
						class:border-green-500={$form.username.length >= 3 &&
							!usernameTaken &&
							!checkingUsername}
						autocomplete="username"
						required
					/>

					<!-- Username feedback -->
					<div class="mt-2">
						{#if checkingUsername}
							<div class="flex items-center text-sm text-slate-400">
								<Loader2 class="mr-1 h-3 w-3 animate-spin" />
								Checking availability...
							</div>
						{:else if $errors.username}
							<p class="text-sm text-red-400">{$errors.username}</p>
						{:else if $form.username.length >= 3 && !usernameTaken && !checkingUsername}
							<p class="text-sm text-green-400">✓ Username available</p>
						{:else if usernameTaken}
							<p class="text-sm text-red-400">Username is already taken</p>
						{/if}
					</div>

					<!-- Username suggestions -->
					{#if usernameTaken && usernameSuggestions.length > 0}
						<div class="mt-3">
							<p class="mb-2 text-sm text-slate-400">Try these available usernames:</p>
							<div class="flex flex-wrap gap-2">
								{#each usernameSuggestions as suggestion}
									<button
										type="button"
										onclick={() => selectSuggestion(suggestion)}
										class="rounded-lg border border-indigo-500/30 bg-indigo-500/20 px-3 py-1 text-sm text-indigo-300 transition-colors hover:bg-indigo-500/30 hover:text-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
									>
										{suggestion}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

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
						autocomplete="new-password"
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
							Creating account...
						</div>
					{:else}
						Create Account
					{/if}
				</button>
			</form>
		</div>
	{/if}
</div>
