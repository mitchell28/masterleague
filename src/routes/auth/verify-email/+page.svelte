<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { emailVerificationSchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';
	import logo from '$lib/assets/logo/masterleague.svg';

	const { data } = $props();

	const { form, errors, message } = superForm(data.form, {
		validators: zod(emailVerificationSchema)
	});

	// Simple state management
	let step: 'request' | 'verify' | 'success' = $state(data.email ? 'verify' : 'request');
	let isLoading = $state(false);
	let isResending = $state(false);
	let statusMessage = $state(
		data.email
			? data.codeSent
				? `We've sent a 6-digit code to ${data.email}`
				: `Enter the 6-digit code sent to ${data.email}`
			: ''
	);

	// Server-side OTP sending for login redirects - no client-side effects needed

	// Send verification OTP (resend only - Better Auth handles initial send)
	async function sendVerificationOTP(e?: Event) {
		if (e) e.preventDefault();

		isResending = true;

		const { data, error } = await authClient.emailOtp.sendVerificationOtp({
			email: $form.email,
			type: 'email-verification'
		});

		if (error) {
			console.error('Failed to send verification OTP:', error);
			$message = error.message || 'Failed to send verification code. Please try again.';
		} else {
			statusMessage = `Code sent to ${$form.email}`;
			setTimeout(() => (statusMessage = ''), 3000);
		}

		isResending = false;
	}

	// Request initial OTP (for users who manually navigate to this page)
	async function requestInitialOTP(e?: Event) {
		if (e) e.preventDefault();

		isLoading = true;

		const { data, error } = await authClient.emailOtp.sendVerificationOtp({
			email: $form.email,
			type: 'email-verification'
		});

		if (error) {
			console.error('Failed to send verification OTP:', error);
			$message = error.message || 'Failed to send verification code. Please try again.';
		} else {
			step = 'verify';
			statusMessage = `We've sent a 6-digit code to ${$form.email}`;
		}

		isLoading = false;
	}

	// Verify email with OTP - optimized flow
	async function verifyEmail(e: Event) {
		e.preventDefault();

		if (isLoading) return;

		isLoading = true;
		statusMessage = 'Verifying email...';
		$message = '';

		// Step 1: Verify the email with OTP
		const { data, error } = await authClient.emailOtp.verifyEmail({
			email: $form.email,
			otp: $form.otp
		});

		if (error) {
			console.error('Email verification failed:', error);
			$message = error.message || 'Verification failed. Please check your code and try again.';
		} else {
			step = 'success';
			statusMessage = 'Email verified successfully!';

			// Determine flow based on sessionStorage
			setTimeout(() => {
				const pendingLogin = sessionStorage.getItem('pendingLogin');
				const signupData = sessionStorage.getItem('signupData');

				if (pendingLogin) {
					handleLoginFlow();
				} else if (signupData) {
					handleSignupFlow();
				} else {
					// Default to login page if no stored data
					goto('/auth/login?verified=true&message=Email verified! Please sign in to continue');
				}
			}, 500);
		}

		isLoading = false;
	}

	// Handle login flow after verification - optimized
	async function handleLoginFlow() {
		statusMessage = 'Signing you in...';

		const pendingLogin = sessionStorage.getItem('pendingLogin');
		if (pendingLogin) {
			const { email, password } = JSON.parse(pendingLogin);
			sessionStorage.removeItem('pendingLogin');

			// Complete sign-in first to ensure session is properly established
			const { data, error } = await authClient.signIn.email({
				email,
				password,
				rememberMe: true
			});

			if (error) {
				console.error('Sign-in failed after verification:', error);
				goto('/auth/login?verified=true');
			} else {
				// Show success and redirect after session is established
				statusMessage = 'Success! Redirecting...';
				setTimeout(() => goto('/predictions'), 300);
			}
		} else {
			goto('/auth/login?verified=true');
		}
	}

	// Handle signup flow after verification - optimized
	async function handleSignupFlow() {
		statusMessage = 'Setting up your account...';

		const signupData = sessionStorage.getItem('signupData');
		if (signupData) {
			const { email, password } = JSON.parse(signupData);
			sessionStorage.removeItem('signupData');

			// Complete sign-in first to ensure session is properly established
			const { data, error } = await authClient.signIn.email({
				email,
				password,
				rememberMe: true
			});

			if (error) {
				console.error('Auto sign-in failed after verification:', error);
				// If auto sign-in fails, they can manually sign in
				goto('/auth/login?verified=true&message=Please sign in to continue');
			} else {
				// Show success and redirect after session is established
				statusMessage = 'Perfect! Taking you to your dashboard...';
				setTimeout(() => goto('/predictions'), 300);
			}
		} else {
			// No stored credentials - redirect to login
			goto('/auth/login?verified=true&message=Email verified! Please sign in to continue');
		}
	}

	// Go back to email input
	function goBack() {
		step = 'request';
		$form.otp = '';
		statusMessage = '';
		$message = '';
	}
</script>

<div class="flex min-h-screen">
	<!-- Verify email form - centered -->
	<div class="mt-22 flex w-full flex-col items-center justify-center p-8">
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
					{step === 'request'
						? 'Verify Your Email'
						: step === 'verify'
							? 'Enter Verification Code'
							: 'Email Verified!'}
				</h1>
				<p class="mt-2 text-sm text-slate-400">
					{step === 'request'
						? 'Enter your email to receive a verification code'
						: step === 'verify'
							? 'Check your email for the verification code'
							: 'Your email has been successfully verified. Setting up your account...'}
				</p>
			</div>

			{#if statusMessage}
				<div class="mb-6 border border-blue-500/30 bg-blue-500/10 p-4">
					<div class="flex items-center space-x-2">
						{#if isLoading}
							<Loader2 class="h-4 w-4 animate-spin text-blue-400" />
						{/if}
						<p class="text-sm text-blue-400">{statusMessage}</p>
					</div>
				</div>
			{/if}

			{#if $message}
				<div
					class="mb-6 border border-red-500/30 bg-red-500/10 p-4"
					style="clip-path: polygon(8% 0%, 100% 0%, 100% 85%, 92% 100%, 0% 100%, 0% 15%);"
				>
					<p class="text-sm text-red-400">{$message}</p>
				</div>
			{/if}

			{#if step !== 'success'}
				<form onsubmit={step === 'request' ? requestInitialOTP : verifyEmail} class="space-y-5">
					{#if step === 'request'}
						<div>
							<label for="email" class="block text-sm font-medium text-slate-300"
								>Email Address</label
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
								placeholder="Enter your email address"
								autocomplete="email"
								required
							/>
							{#if $errors.email}
								<p class="mt-2 text-sm text-red-400">{$errors.email}</p>
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
									Sending...
								</div>
							{:else}
								Send Verification Code
							{/if}
						</button>
					{:else}
						<div>
							<label for="otp" class="block text-sm font-medium text-slate-300"
								>Verification Code</label
							>
							<input
								type="text"
								id="otp"
								name="otp"
								bind:value={$form.otp}
								maxlength="6"
								class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-center font-mono text-2xl tracking-widest text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
								class:border-red-500={$errors.otp}
								placeholder="000000"
								autocomplete="one-time-code"
								required
							/>
							{#if $errors.otp}
								<p class="mt-2 text-sm text-red-400">{$errors.otp}</p>
							{/if}
							<p class="mt-2 text-sm text-slate-400">
								Enter the 6-digit code sent to {$form.email}
							</p>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if isLoading}
								<div class="flex items-center justify-center">
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Verifying...
								</div>
							{:else}
								Verify Email
							{/if}
						</button>

						<button
							type="button"
							onclick={goBack}
							class="w-full border border-slate-600 bg-slate-700/50 px-4 py-2.5 font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
						>
							Back to Email
						</button>

						{#if step === 'verify'}
							<div class="text-center">
								<button
									type="button"
									onclick={sendVerificationOTP}
									disabled={isLoading || isResending}
									class="text-accent hover:text-accent/80 text-sm transition-colors hover:underline disabled:text-slate-500"
								>
									{#if isResending}
										<div class="flex items-center justify-center gap-1">
											<Loader2 class="h-3 w-3 animate-spin" />
											Resending...
										</div>
									{:else}
										Resend Code
									{/if}
								</button>
							</div>
						{/if}
					{/if}
				</form>
			{/if}

			<div class="mt-6 text-center">
				<p class="text-sm text-slate-400">
					Already verified?
					<a
						href="/auth/login"
						class="text-accent hover:text-accent/80 font-medium transition-colors"
					>
						Sign in
					</a>
				</p>
			</div>
		</div>
	</div>
</div>
