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

	// Username validation state
	let usernameValidationError = $state('');

	// Check username availability
	async function checkUsernameAvailability(username: string) {
		if (!username || username.length < 3) return;

		checkingUsername = true;
		usernameTaken = false;
		usernameSuggestions = [];
		usernameValidationError = '';

		try {
			const response = await fetch('/api/check-username', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username })
			});

			const result = await response.json();

			if (response.ok) {
				if (result.taken) {
					usernameTaken = true;
					usernameSuggestions = generateUsernameSuggestions(username);
				}
			} else {
				// Handle validation errors
				if (result.invalid) {
					usernameValidationError = result.error;
				}
			}
		} catch (error) {
			console.error('❌ Frontend: Username check failed:', error);
		} finally {
			checkingUsername = false;
		}
	}

	// Select suggested username
	function selectSuggestion(suggestion: string) {
		$form.username = suggestion;
		usernameTaken = false;
		usernameSuggestions = [];
		usernameValidationError = '';
	}

	// Handle Better Auth sign-up directly
	async function handleSignUp(e: Event) {
		e.preventDefault();

		try {
			await authClient.signUp.email(
				{
					name: $form.firstName + ' ' + $form.lastName, // Better Auth expects 'name' field
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
						console.error('❌ Signup error:', ctx.error.code, ctx.error.message);

						// Handle specific Better Auth error codes
						if (ctx.error.code === 'USERNAME_IS_INVALID') {
							$message =
								'Username is invalid. Please use only letters, numbers, underscores, and hyphens. Username must start with a letter.';
						} else if (ctx.error.status === 429) {
							// Handle rate limiting
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
							// Generic error
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
	<!-- Signup form - centered -->
	<div class="flex w-full flex-col items-center justify-center px-8 py-12">
		<div
			class="w-full max-w-lg bg-slate-900/50 p-8 backdrop-blur-sm"
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
				<div class="mb-6 border border-red-500/30 bg-red-500/10 p-4">
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

							// Clear previous states when user starts typing
							usernameTaken = false;
							usernameSuggestions = [];
							usernameValidationError = '';

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
						class:border-red-500={$errors.username || usernameTaken || usernameValidationError}
						class:border-green-500={$form.username.length >= 3 &&
							!usernameTaken &&
							!checkingUsername &&
							!usernameValidationError &&
							!$errors.username}
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
						{:else if usernameValidationError}
							<p class="text-sm text-red-400">{usernameValidationError}</p>
						{:else if $errors.username}
							<p class="text-sm text-red-400">{$errors.username}</p>
						{:else if $form.username.length >= 3 && !usernameTaken && !checkingUsername && !usernameValidationError}
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

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label for="firstName" class="block text-sm font-medium text-slate-300"
							>First Name</label
						>
						<input
							type="text"
							id="firstName"
							name="firstName"
							bind:value={$form.firstName}
							class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
							class:border-red-500={$errors.firstName}
							class:focus:border-red-500={$errors.firstName}
							class:focus:ring-red-500={$errors.firstName}
							autocomplete="given-name"
							placeholder="Enter your first name"
							required
						/>
						{#if $errors.firstName}
							<p class="mt-2 text-sm text-red-400">{$errors.firstName}</p>
						{/if}
					</div>

					<div>
						<label for="lastName" class="block text-sm font-medium text-slate-300">Last Name</label>
						<input
							type="text"
							id="lastName"
							name="lastName"
							bind:value={$form.lastName}
							class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
							class:border-red-500={$errors.lastName}
							class:focus:border-red-500={$errors.lastName}
							class:focus:ring-red-500={$errors.lastName}
							autocomplete="family-name"
							placeholder="Enter your last name"
							required
						/>
						{#if $errors.lastName}
							<p class="mt-2 text-sm text-red-400">{$errors.lastName}</p>
						{/if}
					</div>
				</div>

				<div>
					<label for="email" class="block text-sm font-medium text-slate-300">Email address</label>
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
</div>
