<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { authSignupSchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';
	import logo from '$lib/assets/logo/masterleague.svg';

	const { data } = $props();

	const { form, errors, message } = superForm(data.form, {
		validators: zod(authSignupSchema)
	});

	// Simple state management
	let isLoading = $state(false);
	let usernameTaken = $state(false);
	let usernameSuggestions = $state<string[]>([]);
	let checkingUsername = $state(false);
	let usernameValidationError = $state('');

	// Debounce timer for username check
	let debounceTimer: NodeJS.Timeout | null = null;

	// Generate username suggestions
	function generateUsernameSuggestions(baseUsername: string): string[] {
		const random = Math.floor(Math.random() * 999) + 1;
		return [
			`${baseUsername}${random}`,
			`${baseUsername}_${Math.floor(Math.random() * 99) + 1}`,
			`${baseUsername}${new Date().getFullYear()}`
		];
	}

	// Check username availability with debouncing
	function handleUsernameInput() {
		if (debounceTimer) clearTimeout(debounceTimer);

		debounceTimer = setTimeout(async () => {
			const username = $form.username;
			if (!username || username.length < 3) {
				usernameTaken = false;
				usernameSuggestions = [];
				usernameValidationError = '';
				return;
			}

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
				} else if (result.invalid) {
					usernameValidationError = result.error;
				}
			} catch (error) {
				console.error('Username check failed:', error);
			} finally {
				checkingUsername = false;
			}
		}, 500);
	}

	// Select a suggested username
	function selectSuggestion(suggestion: string) {
		$form.username = suggestion;
		usernameTaken = false;
		usernameSuggestions = [];
		usernameValidationError = '';
	}

	// Check if email is available
	async function checkEmailAvailability(email: string): Promise<boolean> {
		try {
			const response = await fetch('/api/check-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});
			const result = await response.json();
			return !result.taken;
		} catch (error) {
			console.error('Email check failed:', error);
			return true; // Assume available if check fails
		}
	}

	// Simple, linear signup process
	async function handleSignUp(e: Event) {
		e.preventDefault();

		if (isLoading) return; // Prevent double submission

		isLoading = true;
		$message = '';

		try {
			// Step 1: Check email availability
			console.log('Checking email availability...');
			const emailAvailable = await checkEmailAvailability($form.email);
			if (!emailAvailable) {
				$message = 'An account with this email already exists. Please sign in instead.';
				return;
			}

			// Step 2: Attempt signup with Better Auth
			console.log('Creating account...');
			const signupResult = await authClient.signUp.email({
				name: `${$form.firstName} ${$form.lastName}`,
				username: $form.username,
				email: $form.email,
				password: $form.password
			});

			// Step 3: Store credentials for later use after email verification
			sessionStorage.setItem(
				'signupData',
				JSON.stringify({
					email: $form.email,
					password: $form.password
				})
			);

			// Step 4: Redirect to email verification (OTP will be auto-sent there)
			console.log('Account created successfully, redirecting to email verification...');
			goto(`/auth/verify-email?email=${encodeURIComponent($form.email)}`);
		} catch (error: any) {
			console.error('Signup failed:', error);

			// Handle different error types
			if (error.status === 429) {
				$message = 'Too many signup attempts. Please wait a moment and try again.';
			} else if (error.message?.includes('username') || error.status === 409) {
				usernameTaken = true;
				usernameSuggestions = generateUsernameSuggestions($form.username);
				$message = 'Username is already taken. Try one of the suggestions below.';
			} else if (error.message?.includes('email')) {
				$message = 'An account with this email already exists. Please sign in instead.';
			} else {
				$message = error.message || 'Account creation failed. Please try again.';
			}
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex min-h-screen">
	<!-- Signup form - centered -->
	<div class="flex w-full flex-col items-center justify-center p-8 md:mt-22">
		<div
			class="w-full max-w-md bg-slate-900 p-8"
			style="clip-path: polygon(10% 0%, 100% 0%, 100% 94%, 90% 100%, 0% 100%, 0% 6%);"
		>
			<!-- Logo -->
			<div class="mb-8 text-center">
				<img
					src={logo}
					height="48"
					alt="Master League Logo"
					class="mx-auto mb-4 hidden h-12 md:block"
				/>
				<h1 class="font-display text-xl font-bold tracking-tight text-white md:text-3xl">
					Create Account
				</h1>
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

			<form onsubmit={handleSignUp} class="space-y-5">
				<div>
					<label for="username" class="block text-sm font-medium text-slate-300">Username</label>

					<input
						type="text"
						id="username"
						name="username"
						bind:value={$form.username}
						oninput={handleUsernameInput}
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
							<div class="flex flex-wrap gap-3">
								{#each usernameSuggestions as suggestion}
									<button
										type="button"
										onclick={() => selectSuggestion(suggestion)}
										class="border-accent/30 bg-accent/20 text-accent hover:bg-accent/30 hover:text-accent focus:ring-accent border px-3 py-1 text-sm transition-colors focus:ring-2 focus:outline-none"
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
					disabled={isLoading}
					class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isLoading}
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
