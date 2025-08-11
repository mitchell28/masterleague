<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { authSignupSchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';
	import logo from '$lib/assets/logo/masterleague.svg';

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

<div class="flex min-h-screen">
	{#if $session.data}
		<!-- Already logged in state - centered layout -->
		<div class="flex w-full items-center justify-center">
			<div
				class="border-accent/30 w-full max-w-md border p-8 text-center"
				style="clip-path: polygon(8% 0%, 100% 0%, 100% 85%, 92% 100%, 0% 100%, 0% 15%);"
			>
				<div class="mb-6">
					<img src={logo} height="64" alt="Master League Logo" class="mx-auto mb-4 h-16" />
				</div>
				<h1 class="font-display mb-4 text-2xl font-bold text-white">Welcome!</h1>
				<p class="mb-4 text-slate-300">Hello, {$session?.data?.user.name}</p>
				<p class="mb-6 text-slate-400">You're already signed in.</p>
				<button
					onclick={() => goto('/predictions')}
					class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-3 font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none"
					style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
				>
					Go to Predictions
				</button>
			</div>
		</div>
	{:else}
		<!-- Signup form - centered -->
		<div class="flex w-full flex-col items-center justify-center px-8 py-12">
			<div
				class="w-full max-w-md bg-slate-900/50 p-8 backdrop-blur-sm"
				style="clip-path: polygon(10% 0%, 100% 0%, 100% 94%, 90% 100%, 0% 100%, 0% 6%);"
			>
				<!-- Logo -->
				<div class="mb-8 text-center">
					<img src={logo} height="48" alt="Master League Logo" class="mx-auto mb-4 h-12" />
					<h1 class="font-display text-3xl font-bold tracking-tight text-white">Create Account</h1>
					<p class="mt-2 text-sm text-slate-400">
						Already have an account?
						<a
							href="/auth/login"
							class="text-accent hover:text-accent/80 font-medium transition-colors"
						>
							Sign in
						</a>
					</p>
				</div>

				{#if $message}
					<div
						class="mb-6 border border-red-500/30 bg-red-500/10 p-4"
						style="clip-path: polygon(8% 0%, 100% 0%, 100% 85%, 92% 100%, 0% 100%, 0% 15%);"
					>
						<p class="text-sm text-red-400">{$message}</p>
					</div>
				{/if}

				<form onsubmit={handleSignUp} use:enhance class="space-y-5">
					<div>
						<label for="username" class="block text-sm font-medium text-slate-300">Username</label>
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
							class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
							class:border-red-500={$errors.username || usernameTaken}
							class:border-green-500={$form.username.length >= 3 &&
								!usernameTaken &&
								!checkingUsername}
							autocomplete="username"
							placeholder="Enter your username"
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
											class="border-accent/30 bg-accent/20 text-accent hover:bg-accent/30 hover:text-accent focus:ring-accent border px-3 py-1 text-sm transition-colors focus:ring-2 focus:outline-none"
											style="clip-path: polygon(4% 0%, 100% 0%, 100% 80%, 96% 100%, 0% 100%, 0% 20%);"
										>
											{suggestion}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<div>
						<label for="email" class="block text-sm font-medium text-slate-300">Email address</label
						>
						<input
							type="email"
							id="email"
							name="email"
							bind:value={$form.email}
							class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
							class:border-red-500={$errors.email}
							class:focus:border-red-500={$errors.email}
							class:focus:ring-red-500={$errors.email}
							autocomplete="email"
							placeholder="Enter your email"
							required
						/>
						{#if $errors.email}
							<p class="mt-2 text-sm text-red-400">{$errors.email}</p>
						{/if}
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-slate-300">Password</label>
						<input
							type="password"
							id="password"
							name="password"
							bind:value={$form.password}
							class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
							class:border-red-500={$errors.password}
							class:focus:border-red-500={$errors.password}
							class:focus:ring-red-500={$errors.password}
							autocomplete="new-password"
							placeholder="Enter your password"
							required
						/>
						{#if $errors.password}
							<p class="mt-2 text-sm text-red-400">{$errors.password}</p>
						{/if}
					</div>

					<button
						type="submit"
						disabled={$submitting}
						class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if $submitting}
							<div class="flex items-center justify-center">
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Creating account...
							</div>
						{:else}
							Create Account
						{/if}
					</button>
				</form>
			</div>
		</div>
	{/if}
</div>
