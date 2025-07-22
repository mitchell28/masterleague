<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import { z } from 'zod';
	import { Loader2 } from '@lucide/svelte';

	const session = authClient.useSession();

	// Form state using runes
	let email: string = $state('');
	let otp: string = $state('');
	let step: 'email' | 'otp' = $state('email');
	let errors: Record<string, string> = $state({});
	let errorMessage: string = $state('');
	let isLoading: boolean = $state(false);
	let successMessage: string = $state('');

	// Computed values
	let isEmailValid = $derived(email.length > 0 && email.includes('@'));
	let isOtpValid = $derived(otp.length === 6);

	// Handle input changes
	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const field = target.name;
		const value = target.value;

		// Update the appropriate state variable
		if (field === 'email') email = value;
		if (field === 'otp') otp = value.replace(/\D/g, ''); // Only allow digits

		// Clear error for this field
		if (field in errors) {
			const newErrors = { ...errors };
			delete newErrors[field];
			errors = newErrors;
		}
	}

	// Send OTP to email
	async function sendOTP() {
		if (!isEmailValid) {
			errorMessage = 'Please enter a valid email address';
			return;
		}

		try {
			isLoading = true;
			errorMessage = '';

			await authClient.emailOtp.sendVerificationOtp({
				email,
				type: 'sign-in'
			});

			step = 'otp';
			successMessage = `We've sent a 6-digit code to ${email}`;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to send OTP';
		} finally {
			isLoading = false;
		}
	}

	// Verify OTP and sign in
	async function verifyOTP() {
		if (!isOtpValid) {
			errorMessage = 'Please enter a valid 6-digit code';
			return;
		}

		try {
			isLoading = true;
			errorMessage = '';

			await authClient.signIn.emailOtp(
				{
					email,
					otp
				},
				{
					onSuccess: () => {
						goto('/predictions');
					},
					onError: (ctx) => {
						errorMessage = ctx.error.message;
					}
				}
			);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Invalid verification code';
		} finally {
			isLoading = false;
		}
	}

	// Handle form submission
	async function onSubmit(e: Event) {
		e.preventDefault();

		if (step === 'email') {
			await sendOTP();
		} else {
			await verifyOTP();
		}
	}

	// Go back to email step
	function goBack() {
		step = 'email';
		otp = '';
		successMessage = '';
		errorMessage = '';
	}
</script>

<div class="mx-auto max-w-md p-8">
	{#if $session.data}
		<div class="text-center">
			<h1 class="mb-4 text-2xl font-bold">Welcome back!</h1>
			<p class="mb-4">
				Hello, {$session?.data?.user.name}
			</p>
			<button
				onclick={async () => {
					await authClient.signOut();
				}}
				class="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
			>
				Sign Out
			</button>
		</div>
	{:else}
		<h1 class="mb-8 text-center text-2xl font-bold">
			{step === 'email' ? 'Sign In with Email Code' : 'Enter Verification Code'}
		</h1>

		{#if successMessage}
			<div class="mb-4 rounded-md bg-green-50 p-3">
				<p class="text-sm text-green-700">{successMessage}</p>
			</div>
		{/if}

		<form onsubmit={onSubmit}>
			{#if step === 'email'}
				<div class="mb-4">
					<label for="email" class="mb-2 block font-medium">Email Address</label>
					<input
						type="email"
						id="email"
						name="email"
						oninput={handleInput}
						value={email}
						class="w-full rounded-md border border-gray-300 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
						placeholder="Enter your email address"
						autocomplete="email"
						required
					/>
					{#if errors.email}
						<p class="mt-1 text-sm text-red-500">{errors.email}</p>
					{/if}
				</div>

				<button
					type="submit"
					disabled={isLoading || !isEmailValid}
					class="mb-4 w-full rounded-md bg-indigo-600 px-3 py-3 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
				>
					{#if isLoading}
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
						oninput={handleInput}
						value={otp}
						maxlength="6"
						class="w-full rounded-md border border-gray-300 px-3 py-3 text-center font-mono text-2xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:outline-none"
						placeholder="000000"
						autocomplete="one-time-code"
						required
					/>
					{#if errors.otp}
						<p class="mt-1 text-sm text-red-500">{errors.otp}</p>
					{/if}
					<p class="mt-2 text-sm text-gray-600">
						Enter the 6-digit code sent to {email}
					</p>
				</div>

				<button
					type="submit"
					disabled={isLoading || !isOtpValid}
					class="mb-4 w-full rounded-md bg-indigo-600 px-3 py-3 font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
				>
					{#if isLoading}
						<div class="flex items-center justify-center">
							<Loader2 class="mr-2 h-5 w-5 animate-spin text-white" />
							Verifying...
						</div>
					{:else}
						Sign In
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
						onclick={sendOTP}
						disabled={isLoading}
						class="text-sm text-indigo-600 hover:text-indigo-800 hover:underline disabled:text-gray-400"
					>
						Resend Code
					</button>
				</div>
			{/if}

			{#if errorMessage}
				<div class="mb-4 rounded-md bg-red-50 p-3">
					<p class="text-sm text-red-700">{errorMessage}</p>
				</div>
			{/if}
		</form>

		<div class="mt-6 text-center">
			<p class="text-sm text-gray-600">
				Prefer password? <a
					href="/auth/login"
					class="text-indigo-600 hover:text-indigo-800 hover:underline">Sign in with password</a
				>
			</p>
			<p class="mt-2 text-sm text-gray-600">
				Don't have an account? <a
					href="/auth/signup"
					class="text-indigo-600 hover:text-indigo-800 hover:underline">Sign up</a
				>
			</p>
		</div>
	{/if}
</div>
