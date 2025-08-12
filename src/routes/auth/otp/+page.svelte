<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authClient } from '$lib/client/auth-client';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { otpVerifySchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';
	import logo from '$lib/assets/logo/masterleague.svg';

	const { data } = $props();

	const session = authClient.useSession();

	// Get redirect URL from query params, default to predictions
	let redirectTo = $derived($page.url.searchParams.get('redirectTo') || '/predictions');

	// Redirect if already logged in
	$effect(() => {
		if ($session.data && !isLoading) {
			goto(redirectTo, { replaceState: true });
		}
	});

	const { form, errors, enhance, submitting, message } = superForm(data.form, {
		validators: zod(otpVerifySchema)
	});

	// Form state using runes
	let step: 'email' | 'otp' = $state(data.email ? 'otp' : 'email');
	let successMessage: string = $state('');
	let isLoading = $state(false);
	let isResending = $state(false);

	// Check if email exists in the system
	async function checkEmailExists(email: string): Promise<boolean> {
		try {
			const response = await fetch('/api/check-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const result = await response.json();

			if (!response.ok) {
				// If there's a validation error (invalid email format)
				if (result.invalid) {
					$message = result.error;
					return false;
				}
				throw new Error(result.error || 'Failed to check email');
			}

			return result.taken; // Return true if email exists (is "taken")
		} catch (error) {
			console.error('Failed to check email existence:', error);
			throw error;
		}
	}

	// Send OTP
	async function sendOTP(e?: Event) {
		if (e) e.preventDefault();

		// Check if this is a resend operation
		const isResendOperation = step === 'otp';

		if (isResendOperation) {
			isResending = true;
		} else {
			isLoading = true;
		}

		try {
			// For new OTP requests (not resends), check if email exists first
			if (!isResendOperation) {
				const emailExists = await checkEmailExists($form.email);

				if (!emailExists) {
					$message = `No account found with email ${$form.email}. Please sign up first or check your email address.`;
					return;
				}
			}

			const result = await authClient.emailOtp.sendVerificationOtp({
				email: $form.email,
				type: 'sign-in'
			});

			if (result.data) {
				if (isResendOperation) {
					successMessage = `Code resent to ${$form.email}`;
					// Clear the success message after 3 seconds
					setTimeout(() => {
						successMessage = '';
					}, 3000);
				} else {
					step = 'otp';
					successMessage = `We've sent a 6-digit code to ${$form.email}`;
				}
				// Clear any previous error messages
				$message = '';
			} else if (result.error) {
				console.error('Failed to send OTP:', result.error);
				$message = result.error.message || 'Failed to send verification code. Please try again.';
			}
		} catch (error) {
			console.error('Failed to send OTP:', error);
			$message = 'Something went wrong. Please try again.';
		} finally {
			if (isResendOperation) {
				isResending = false;
			} else {
				isLoading = false;
			}
		}
	} // Sign in with OTP
	async function signInWithOTP(e: Event) {
		e.preventDefault();

		isLoading = true;
		try {
			const result = await authClient.signIn.emailOtp({
				email: $form.email,
				otp: $form.otp
			});

			if (result.data) {
				// Sign in successful - redirect immediately
				// The session will be updated automatically via cookies
				goto(redirectTo, { replaceState: true });
			} else if (result.error) {
				console.error('OTP sign in failed:', result.error);
				$message = result.error.message || 'Invalid verification code. Please try again.';
			}
		} catch (error) {
			console.error('OTP sign in failed:', error);
			$message = 'Something went wrong. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	// Handle OTP input to only allow digits
	function handleOtpInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = target.value.replace(/\D/g, '').slice(0, 6);
		$form.otp = value;

		// Clear any error messages when user starts typing
		if ($message) {
			$message = '';
		}
	}

	// Go back to email step
	function goBack() {
		step = 'email';
		$form.otp = '';
		successMessage = '';
	}
</script>

<div class="flex min-h-screen">
	<!-- OTP form - centered -->
	<div class="flex w-full flex-col items-center justify-center px-8 py-12">
		<div
			class="w-full max-w-md bg-slate-900 p-8 backdrop-blur-sm"
			style="clip-path: polygon(10% 0%, 100% 0%, 100% 94%, 90% 100%, 0% 100%, 0% 6%);"
		>
			<!-- Logo -->
			<div class="mb-8 text-center">
				<img src={logo} height="48" alt="Master League Logo" class="mx-auto mb-4 h-12" />
				<h1 class="font-display text-3xl font-bold tracking-tight text-white">
					{step === 'email' ? 'Sign in with one time code' : 'Enter verification code'}
				</h1>
				<p class="mt-2 text-sm text-slate-400">
					{step === 'email' ? "We'll send you a secure code" : `Code sent to ${$form.email}`}
				</p>
			</div>

			<!-- Success message -->
			{#if successMessage}
				<div class="mb-6 border border-green-500/30 bg-green-500/10 p-4">
					<p class="text-sm text-green-400">{successMessage}</p>
				</div>
			{/if}

			<!-- Error messages -->
			{#if $message}
				<div class="mb-6 border border-red-500/30 bg-red-500/10 p-4">
					<p class="text-sm text-red-400">{$message}</p>
					{#if $message.includes('No account found')}
						<p class="mt-2 text-sm text-red-300">
							<a
								href="/auth/signup"
								class="text-accent hover:text-accent/80 font-medium underline transition-colors"
							>
								Create an account
							</a>
							or double-check your email address.
						</p>
					{/if}
				</div>
			{/if}

			{#if step === 'email'}
				<!-- Email form -->
				<form onsubmit={sendOTP} class="space-y-5">
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
						disabled={isLoading || !$form.email}
						class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isLoading}
							<div class="flex items-center justify-center">
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Sending code...
							</div>
						{:else}
							Send verification code
						{/if}
					</button>
				</form>
			{:else}
				<!-- OTP form -->
				<form onsubmit={signInWithOTP} class="space-y-5">
					<div>
						<label for="otp" class="block text-sm font-medium text-slate-300"
							>Verification Code</label
						>
						<input
							type="text"
							id="otp"
							name="otp"
							bind:value={$form.otp}
							oninput={handleOtpInput}
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
						disabled={isLoading || !$form.otp || $form.otp.length !== 6}
						class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isLoading}
							<div class="flex items-center justify-center">
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Verifying...
							</div>
						{:else}
							Sign in
						{/if}
					</button>

					<button
						type="button"
						onclick={goBack}
						class="w-full border border-slate-600 bg-slate-700/50 px-4 py-2.5 font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
					>
						Back to email
					</button>

					<div class="text-center">
						<button
							type="button"
							onclick={sendOTP}
							disabled={isLoading || isResending}
							class="text-accent hover:text-accent/80 text-sm transition-colors hover:underline disabled:text-slate-500"
						>
							{#if isResending}
								<div class="flex items-center justify-center gap-1">
									<Loader2 class="h-3 w-3 animate-spin" />
									Resending...
								</div>
							{:else}
								Resend code
							{/if}
						</button>
					</div>
				</form>
			{/if}

			<div class="mt-6 text-center">
				<p class="text-sm text-slate-400">
					Prefer password?
					<a
						href="/auth/login"
						class="text-accent hover:text-accent/80 font-medium transition-colors"
					>
						Sign in with password
					</a>
				</p>
				<p class="mt-2 text-sm text-slate-400">
					Don't have an account?
					<a
						href="/auth/signup"
						class="text-accent hover:text-accent/80 font-medium transition-colors"
					>
						Sign up
					</a>
				</p>
			</div>
		</div>
	</div>
</div>
