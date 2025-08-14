<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { authLoginSchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';
	import logo from '$lib/assets/logo/masterleague.svg';

	const { data } = $props();

	const { form, errors, message } = superForm(data.form, {
		validators: zod(authLoginSchema)
	});

	// Simple state management
	let isLoading = $state(false);
	let verificationSuccessMessage = $state('');

	// Simple, linear login process
	async function handleSignIn(e: Event) {
		e.preventDefault();

		if (isLoading) return;

		isLoading = true;
		$message = '';

		try {
			// Attempt sign in with Better Auth
			await authClient.signIn.email({
				email: $form.email,
				password: $form.password,
				rememberMe: true
			});

			// Success - redirect to predictions
			goto('/predictions');
		} catch (error: any) {
			console.error('Sign in failed:', error);

			// Handle email verification requirement (403 = unverified email)
			if (error.status === 403) {
				// Store credentials for after verification
				sessionStorage.setItem(
					'pendingLogin',
					JSON.stringify({
						email: $form.email,
						password: $form.password
					})
				);

				$message = 'Please verify your email address before signing in. Redirecting...';

				// Redirect to verification (OTP will be auto-sent there)
				setTimeout(() => {
					goto(`/auth/verify-email?email=${encodeURIComponent($form.email)}&from=login`);
				}, 1500);
				return;
			}

			// Handle rate limiting
			if (error.status === 429) {
				const retryAfter = error.headers?.get('X-Retry-After');
				$message = `Too many login attempts. Please wait ${retryAfter || 60} seconds.`;
			} else {
				// Generic error for security
				$message = 'Invalid email or password. Please check your credentials and try again.';
			}
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex min-h-screen">
	<!-- Login form - centered -->
	<div class="flex w-full flex-col items-center justify-center p-8 md:mt-22">
		<div
			class="w-full max-w-md bg-slate-900 p-8"
			style="clip-path: polygon(10% 0%, 100% 0%, 100% 94%, 90% 100%, 0% 100%, 0% 6%);"
		>
			<!-- Logo -->
			<img
				src={logo}
				height="48"
				alt="Master League Logo"
				class="mx-auto mb-4 hidden h-12 md:block"
			/>
			<div class="mb-8 text-center">
				<h1 class="font-display text-xl font-bold tracking-tight text-white md:text-3xl">
					Sign in to your account
				</h1>
				<p class="mt-2 text-sm text-slate-400">
					Don't have an account?
					<a
						href="/auth/signup"
						class="text-accent hover:text-accent/80 font-medium transition-colors"
					>
						Sign up for free
					</a>
				</p>
			</div>

			<!-- Success message -->
			{#if verificationSuccessMessage}
				<div class="mb-6 border border-green-500/30 bg-green-500/10 p-4">
					<p class="text-sm text-green-400">{verificationSuccessMessage}</p>
				</div>
			{/if}

			<!-- Error message -->
			{#if $message}
				<div class="mb-6 border border-red-500/30 bg-red-500/10 p-4">
					<p class="text-sm text-red-400">{$message}</p>
				</div>
			{/if}

			<!-- Login form -->
			<form onsubmit={handleSignIn} class="space-y-5">
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
						autocomplete="current-password"
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
					class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0D1326] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isLoading}
						<div class="flex items-center justify-center">
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Signing in...
						</div>
					{:else}
						Sign in
					{/if}
				</button>
			</form>

			<!-- Alternative sign in -->
			<div class="mt-6">
				<p class="text-center text-sm text-slate-400">
					<a
						href="/auth/otp"
						class="text-accent hover:text-accent/80 font-medium transition-colors"
					>
						Sign in with one time code
					</a>
				</p>
			</div>
		</div>
	</div>
</div>
