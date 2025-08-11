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

	// Send verification OTP
	async function sendVerificationOTP() {
		try {
			await authClient.emailOtp.sendVerificationOtp({
				email: $form.email,
				type: 'email-verification'
			});

			step = 'verify';
			successMessage = `We've sent a 6-digit code to ${$form.email}`;
		} catch (error) {
			console.error('Failed to send verification OTP:', error);
		}
	}

	// Verify email with OTP
	async function verifyEmail(e: Event) {
		e.preventDefault();

		try {
			await authClient.emailOtp.verifyEmail({
				email: $form.email,
				otp: $form.otp
			});

			// Email verified successfully - redirect to login or predictions
			goto('/predictions');
		} catch (error) {
			console.error('Email verification failed:', error);
		}
	}

	// Go back to request step
	function goBack() {
		step = 'request';
		$form.otp = '';
		successMessage = '';
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-[#0D1326] px-4">
	<div class="mx-auto w-full max-w-md">
		<!-- Logo -->
		<div class="mb-8 text-center">
			<img src={logo} alt="Master League" class="mx-auto mb-6 h-16" />
		</div>

		<!-- Auth container with subtle clip-path -->
		<div
			class="bg-navy-darker/80 border-navy-light/20 rounded-2xl border p-8 shadow-2xl backdrop-blur-sm"
			style="clip-path: polygon(0% 5%, 5% 0%, 95% 0%, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0% 95%)"
		>
			<h1 class="font-display mb-2 text-center text-3xl font-bold text-white">
				{step === 'request' ? 'Verify Your Email' : 'Enter Verification Code'}
			</h1>
			<p class="text-navy-light mb-8 text-center">
				{step === 'request'
					? 'Enter your email to receive a verification link'
					: 'Check your email for the verification code'}
			</p>

			{#if successMessage}
				<div class="mb-6 rounded-lg border border-green-500/30 bg-green-600/20 p-4">
					<p class="text-sm text-green-400">{successMessage}</p>
				</div>
			{/if}

			{#if $message}
				<div class="mb-6 rounded-lg border border-red-500/30 bg-red-600/20 p-4">
					<p class="text-sm text-red-400">{$message}</p>
				</div>
			{/if}

			<form onsubmit={step === 'request' ? sendVerificationOTP : verifyEmail}>
				{#if step === 'request'}
					<div class="mb-6">
						<label for="email" class="text-navy-light mb-2 block text-sm font-medium"
							>Email Address</label
						>
						<input
							type="email"
							id="email"
							name="email"
							bind:value={$form.email}
							class="bg-navy-darker border-navy-light/30 placeholder-navy-light/60 focus:border-accent w-full rounded-lg border px-4 py-3 text-white transition-colors focus:outline-none"
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
						disabled={$submitting}
						class="bg-accent hover:bg-accent/90 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-black transition-colors disabled:opacity-50"
					>
						{#if $submitting}
							<Loader2 class="h-4 w-4 animate-spin" />
							Sending...
						{:else}
							Send Verification Email
						{/if}
					</button>
				{:else}
					<div class="mb-6">
						<label for="otp" class="text-navy-light mb-2 block text-sm font-medium"
							>Verification Code</label
						>
						<input
							type="text"
							id="otp"
							name="otp"
							bind:value={$form.otp}
							maxlength="6"
							class="bg-navy-darker border-navy-light/30 placeholder-navy-light/60 focus:border-accent w-full rounded-lg border px-4 py-3 text-center font-mono text-xl tracking-widest text-white transition-colors focus:outline-none"
							class:border-red-500={$errors.otp}
							placeholder="000000"
							autocomplete="one-time-code"
							required
						/>
						{#if $errors.otp}
							<p class="mt-2 text-sm text-red-400">{$errors.otp}</p>
						{/if}
						<p class="text-navy-light mt-2 text-sm">
							Enter the 6-digit code sent to {$form.email}
						</p>
					</div>

					<button
						type="submit"
						disabled={$submitting}
						class="bg-accent hover:bg-accent/90 mb-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-black transition-colors disabled:opacity-50"
					>
						{#if $submitting}
							<Loader2 class="h-4 w-4 animate-spin" />
							Verifying...
						{:else}
							Verify Email
						{/if}
					</button>

					<button
						type="button"
						onclick={goBack}
						class="border-navy-light/30 hover:bg-navy-light/10 w-full rounded-lg border bg-transparent px-4 py-3 text-white transition-colors"
					>
						Back to Email
					</button>

					{#if step === 'verify'}
						<div class="mt-4 text-center">
							<button
								type="button"
								onclick={sendVerificationOTP}
								disabled={$submitting}
								class="text-accent hover:text-accent/80 text-sm hover:underline disabled:opacity-50"
							>
								Resend Code
							</button>
						</div>
					{/if}
				{/if}
			</form>

			<div class="mt-8 text-center">
				<p class="text-navy-light text-sm">
					Already verified? <a
						href="/auth/login"
						class="text-accent hover:text-accent/80 font-medium hover:underline">Sign in</a
					>
				</p>
			</div>
		</div>
	</div>
</div>
