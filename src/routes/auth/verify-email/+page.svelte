<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { emailVerificationSchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';
	import logo from '$lib/assets/logo/masterleague.svg';

	const { data } = $props();

	const { form, errors, enhance, submitting, message } = superForm(data.form, {
		validators: zod(emailVerificationSchema)
	});

	let step: 'request' | 'verify' = $state(data.email ? 'verify' : 'request');
	let successMessage: string = $state('');
	let isLoading = $state(false);
	let isResending = $state(false);

	// Send verification OTP
	async function sendVerificationOTP(e?: Event) {
		if (e) e.preventDefault();

		// Check if this is a resend operation
		const isResendOperation = step === 'verify';

		if (isResendOperation) {
			isResending = true;
		} else {
			isLoading = true;
		}

		try {
			await authClient.emailOtp.sendVerificationOtp({
				email: $form.email,
				type: 'email-verification'
			});

			if (isResendOperation) {
				successMessage = `Code resent to ${$form.email}`;
				// Clear the success message after 3 seconds
				setTimeout(() => {
					successMessage = '';
				}, 3000);
			} else {
				step = 'verify';
				successMessage = `We've sent a 6-digit code to ${$form.email}`;
			}
		} catch (error) {
			console.error('Failed to send verification OTP:', error);
			// Set error message that will show in the main message area
		} finally {
			if (isResendOperation) {
				isResending = false;
			} else {
				isLoading = false;
			}
		}
	} // Verify email with OTP
	async function verifyEmail(e: Event) {
		e.preventDefault();

		isLoading = true;
		try {
			await authClient.emailOtp.verifyEmail({
				email: $form.email,
				otp: $form.otp
			});

			// Email verified successfully - redirect to login or predictions
			goto('/predictions');
		} catch (error) {
			console.error('Email verification failed:', error);
		} finally {
			isLoading = false;
		}
	}

	// Go back to request step
	function goBack() {
		step = 'request';
		$form.otp = '';
		successMessage = '';
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
					{step === 'request' ? 'Verify Your Email' : 'Enter Verification Code'}
				</h1>
				<p class="mt-2 text-sm text-slate-400">
					{step === 'request'
						? 'Enter your email to receive a verification code'
						: 'Check your email for the verification code'}
				</p>
			</div>

			{#if successMessage}
				<div class="mb-6 border border-green-500/30 bg-green-500/10 p-4">
					<p class="text-sm text-green-400">{successMessage}</p>
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

			<form onsubmit={step === 'request' ? sendVerificationOTP : verifyEmail} class="space-y-5">
				{#if step === 'request'}
					<div>
						<label for="email" class="block text-sm font-medium text-slate-300">Email Address</label
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
