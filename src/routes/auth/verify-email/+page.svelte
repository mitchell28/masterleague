<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { otpRequestSchema, emailVerificationSchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import logo from '$lib/assets/logo/masterleague.svg';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const initialRequestForm = data.requestForm;
	// svelte-ignore state_referenced_locally
	const initialVerifyForm = data.verifyForm;
	// svelte-ignore state_referenced_locally
	const initialEmail = data.email;
	// svelte-ignore state_referenced_locally
	const initialCodeSent = data.codeSent;

	// Setup forms for both request and verify actions
	const {
		form: requestForm,
		errors: requestErrors,
		message: requestMessage,
		enhance: requestEnhance,
		submitting: requestSubmitting
	} = superForm(initialRequestForm, {
		validators: zod4Client(otpRequestSchema),
		onResult: ({ result }) => {
			if (result.type === 'success') {
				step = 'verify';
				statusMessage = `Verification code sent to ${$requestForm.email}`;
				// Copy email to verify form
				$verifyForm.email = $requestForm.email;
			}
		}
	});

	const {
		form: verifyForm,
		errors: verifyErrors,
		message: verifyMessage,
		enhance: verifyEnhance,
		submitting: verifySubmitting
	} = superForm(initialVerifyForm, {
		validators: zod4Client(emailVerificationSchema),
		onResult: ({ result }) => {
			console.log('🔍 [Verify Email] onResult called:', result);

			// Clear signup data on successful verification (server handles redirect)
			if (result.type === 'redirect' && typeof sessionStorage !== 'undefined') {
				console.log('✅ [Verify Email] Verification successful, clearing signup data');
				sessionStorage.removeItem('signupData');
			}
		}
	});

	// Simple state management
	let step: 'request' | 'verify' | 'success' = $state(initialEmail ? 'verify' : 'request');
	let statusMessage = $state(
		initialEmail
			? initialCodeSent
				? `We've sent a 6-digit code to ${initialEmail}`
				: `Enter the 6-digit code sent to ${initialEmail}`
			: ''
	);

	// Store signup credentials if available
	let signupCredentials = $state<{ email: string; password: string } | null>(null);

	// Check for stored signup credentials on mount
	$effect(() => {
		if (typeof sessionStorage !== 'undefined') {
			const signupData = sessionStorage.getItem('signupData');
			if (signupData) {
				try {
					signupCredentials = JSON.parse(signupData);
				} catch (e) {
					console.error('Failed to parse signup data:', e);
				}
			}
		}
	});

	// Initialize email if provided from URL
	if (initialEmail) {
		$requestForm.email = initialEmail;
		$verifyForm.email = initialEmail;
	}

	// Handle step navigation
	function goToRequestStep() {
		step = 'request';
		$verifyForm.otp = '';
		statusMessage = '';
	}

	// Handle OTP input formatting
	function handleOtpInput(event: Event) {
		const input = event.target as HTMLInputElement;
		// Remove any non-digit characters
		const value = input.value.replace(/\D/g, '');
		// Limit to 6 digits
		const limitedValue = value.slice(0, 6);
		// Update the form value
		$verifyForm.otp = limitedValue;
		// Update the input value to reflect the cleaned input
		input.value = limitedValue;
	}

	// Handle resend OTP
	async function resendOtp() {
		// Set the request form email and submit
		$requestForm.email = $verifyForm.email;
		// Trigger the request form submission
		const formData = new FormData();
		formData.append('email', $verifyForm.email);

		try {
			const response = await fetch('?/sendOtp', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				statusMessage = `New verification code sent to ${$verifyForm.email}`;
			}
		} catch (error) {
			console.error('Failed to resend OTP:', error);
		}
	}
</script>

<div class="flex min-h-screen">
	<!-- Verify email form - centered -->
	<div class="flex w-full flex-col items-center justify-center p-8">
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

			<!-- Display messages -->
			{#if statusMessage}
				<div class="mb-6 border border-blue-500/30 bg-blue-500/10 p-4">
					<div class="flex items-center space-x-2">
						{#if $requestSubmitting || $verifySubmitting}
							<Loader2 class="h-4 w-4 animate-spin text-blue-400" />
						{/if}
						<p class="text-sm text-blue-400">{statusMessage}</p>
					</div>
				</div>
			{/if}

			<!-- Error messages -->
			{#if $requestMessage}
				<div class="mb-6 border border-red-500/30 bg-red-500/10 p-4">
					<p class="text-sm text-red-400">{$requestMessage}</p>
				</div>
			{/if}

			{#if $verifyMessage}
				<div class="mb-6 border border-red-500/30 bg-red-500/10 p-4">
					<p class="text-sm text-red-400">{$verifyMessage}</p>
				</div>
			{/if}

			{#if step === 'request'}
				<!-- Email request form -->
				<form method="POST" action="?/sendOtp" use:requestEnhance class="space-y-5">
					<div>
						<label for="email" class="block text-sm font-medium text-slate-300">Email Address</label
						>
						<input
							type="email"
							id="email"
							name="email"
							bind:value={$requestForm.email}
							class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
							class:border-red-500={$requestErrors.email}
							class:focus:border-red-500={$requestErrors.email}
							class:focus:ring-red-500={$requestErrors.email}
							autocomplete="email"
							placeholder="Enter your email address"
						/>
						{#if $requestErrors.email}
							<p class="mt-2 text-sm text-red-400">{$requestErrors.email}</p>
						{/if}
					</div>

					<button
						type="submit"
						disabled={$requestSubmitting}
						class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0D1326] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if $requestSubmitting}
							<div class="flex items-center justify-center">
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Sending Code...
							</div>
						{:else}
							Send Verification Code
						{/if}
					</button>
				</form>
			{:else if step === 'verify'}
				<!-- OTP verification form -->
				<form method="POST" action="?/verifyEmail" use:verifyEnhance novalidate class="space-y-5">
					<input type="hidden" name="email" value={$verifyForm.email} />

					<!-- Include signup credentials if available for server-side auto-login -->
					{#if signupCredentials}
						<input type="hidden" name="signupEmail" value={signupCredentials.email} />
						<input type="hidden" name="signupPassword" value={signupCredentials.password} />
					{/if}

					<div>
						<label for="otp" class="block text-sm font-medium text-slate-300"
							>Verification Code</label
						>
						<input
							type="text"
							id="otp"
							name="otp"
							bind:value={$verifyForm.otp}
							oninput={handleOtpInput}
							class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-center font-mono text-2xl tracking-widest text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
							class:border-red-500={$verifyErrors.otp}
							class:focus:border-red-500={$verifyErrors.otp}
							class:focus:ring-red-500={$verifyErrors.otp}
							placeholder="000000"
							maxlength="6"
							required
							autocomplete="one-time-code"
							inputmode="numeric"
						/>
						{#if $verifyErrors.otp}
							<p class="mt-2 text-sm text-red-400">{$verifyErrors.otp}</p>
						{/if}
						<p class="mt-2 text-sm text-slate-400">
							Enter the 6-digit code sent to {$verifyForm.email}
						</p>
					</div>

					<button
						type="submit"
						disabled={$verifySubmitting}
						class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0D1326] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if $verifySubmitting}
							<div class="flex items-center justify-center">
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Verifying...
							</div>
						{:else}
							Verify Email
						{/if}
					</button>

					<!-- Resend code button -->
					<div class="text-center">
						<button
							type="button"
							onclick={resendOtp}
							disabled={$requestSubmitting}
							class="text-accent hover:text-accent/80 text-sm font-medium transition-colors disabled:opacity-50"
						>
							{#if $requestSubmitting}
								Sending...
							{:else}
								Resend Code
							{/if}
						</button>
					</div>

					<!-- Go back option -->
					<div class="text-center">
						<button
							type="button"
							onclick={goToRequestStep}
							class="text-sm text-slate-400 transition-colors hover:text-slate-300"
						>
							← Use a different email
						</button>
					</div>
				</form>
			{:else if step === 'success'}
				<!-- Success state -->
				<div class="text-center">
					<div class="mb-4 text-green-400">
						<svg class="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							></path>
						</svg>
					</div>
					<p class="text-slate-300">Your email has been verified successfully!</p>
					<p class="mt-2 text-sm text-slate-400">Redirecting you to your dashboard...</p>
				</div>
			{/if}

			<!-- Footer links -->
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
