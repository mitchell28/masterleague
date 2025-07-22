<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { emailVerificationSchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';

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

<div class="mx-auto max-w-md p-8">
	<h1 class="mb-8 text-center text-2xl font-bold">
		{step === 'request' ? 'Verify Your Email' : 'Enter Verification Code'}
	</h1>

	{#if successMessage}
		<div class="mb-4 rounded-md bg-green-50 p-3">
			<p class="text-sm text-green-700">{successMessage}</p>
		</div>
	{/if}

	{#if $message}
		<div class="mb-4 rounded-md bg-red-50 p-3">
			<p class="text-sm text-red-700">{$message}</p>
		</div>
	{/if}

	<form onsubmit={step === 'request' ? sendVerificationOTP : verifyEmail}>
		{#if step === 'request'}
			<div class="mb-4">
				<label for="email" class="mb-2 block font-medium">Email Address</label>
				<input
					type="email"
					id="email"
					name="email"
					bind:value={$form.email}
					class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
					class:border-red-500={$errors.email}
					placeholder="Enter your email address"
					autocomplete="email"
					required
				/>
				{#if $errors.email}
					<p class="mt-1 text-sm text-red-500">{$errors.email}</p>
				{/if}
			</div>

			<button
				type="submit"
				disabled={$submitting}
				class="mb-4 w-full rounded-md bg-indigo-600 px-3 py-3 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
			>
				{#if $submitting}
					<div class="flex items-center justify-center">
						<Loader2 class="mr-2 h-5 w-5 animate-spin text-white" />
						Sending Code...
					</div>
				{:else}
					Send Verification Code
				{/if}
			</button>
		{:else}
			<div class="mb-4">
				<label for="otp" class="mb-2 block font-medium">Verification Code</label>
				<input
					type="text"
					id="otp"
					name="otp"
					bind:value={$form.otp}
					maxlength="6"
					class="w-full rounded-md border border-gray-300 px-3 py-3 text-center font-mono text-2xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:outline-none"
					class:border-red-500={$errors.otp}
					placeholder="000000"
					autocomplete="one-time-code"
					required
				/>
				{#if $errors.otp}
					<p class="mt-1 text-sm text-red-500">{$errors.otp}</p>
				{/if}
				<p class="mt-2 text-sm text-gray-600">
					Enter the 6-digit code sent to {$form.email}
				</p>
			</div>

			<button
				type="submit"
				disabled={$submitting}
				class="mb-4 w-full rounded-md bg-indigo-600 px-3 py-3 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
			>
				{#if $submitting}
					<div class="flex items-center justify-center">
						<Loader2 class="mr-2 h-5 w-5 animate-spin text-white" />
						Verifying...
					</div>
				{:else}
					Verify Email
				{/if}
			</button>

			<button
				type="button"
				onclick={goBack}
				class="mb-4 w-full rounded-md border border-gray-300 px-3 py-3 font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
			>
				Back to Email
			</button>

			<div class="text-center">
				<button
					type="button"
					onclick={sendVerificationOTP}
					disabled={$submitting}
					class="text-sm text-indigo-600 hover:text-indigo-800 hover:underline disabled:text-gray-400"
				>
					Resend Code
				</button>
			</div>
		{/if}
	</form>

	<div class="mt-6 text-center">
		<p class="text-sm text-gray-600">
			Already verified? <a
				href="/auth/login"
				class="text-indigo-600 hover:text-indigo-800 hover:underline">Sign in</a
			>
		</p>
	</div>
</div>
