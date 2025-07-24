<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authClient } from '$lib/client/auth-client';
	import { z } from 'zod';
	import { Loader2 } from '@lucide/svelte';

	const session = authClient.useSession();

	// Get redirect URL from query params, default to predictions
	let redirectTo = $derived($page.url.searchParams.get('redirectTo') || '/predictions');

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
						goto(redirectTo);
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

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4"
>
	{#if $session.data}
		<div
			class="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 text-center backdrop-blur-sm"
		>
			<div class="mb-6">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600"
				>
					<span class="text-2xl font-bold text-white">ML</span>
				</div>
			</div>
			<h1 class="mb-4 text-2xl font-bold text-white">Welcome back!</h1>
			<p class="mb-6 text-slate-300">Hello, {$session?.data?.user.name}</p>
			<button
				onclick={async () => {
					await authClient.signOut();
				}}
				class="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
			>
				Sign Out
			</button>
		</div>
	{:else}
		<div
			class="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 backdrop-blur-sm"
		>
			<div class="mb-8 text-center">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600"
				>
					<span class="text-2xl font-bold text-white">ML</span>
				</div>
				<h1 class="mb-2 text-3xl font-bold text-white">
					{step === 'email' ? 'Sign in with magic link' : 'Enter verification code'}
				</h1>
				<p class="text-slate-400">
					{step === 'email' ? "We'll send you a secure code" : `Code sent to ${email}`}
				</p>
			</div>

			{#if successMessage}
				<div class="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
					<p class="text-sm text-green-400">{successMessage}</p>
				</div>
			{/if}

			{#if errorMessage}
				<div class="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
					<p class="text-sm text-red-400">{errorMessage}</p>
				</div>
			{/if}

			<form onsubmit={onSubmit} class="space-y-6">
				{#if step === 'email'}
					<div>
						<label for="email" class="mb-2 block text-sm font-medium text-slate-300">E-mail</label>
						<input
							type="email"
							id="email"
							name="email"
							oninput={handleInput}
							value={email}
							class="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
							placeholder="Enter your email address"
							autocomplete="email"
							required
						/>
						{#if errors.email}
							<p class="mt-2 text-sm text-red-400">{errors.email}</p>
						{/if}
					</div>

					<button
						type="submit"
						disabled={isLoading || !isEmailValid}
						class="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all duration-200 hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isLoading}
							<div class="flex items-center justify-center">
								<Loader2 class="mr-2 h-5 w-5 animate-spin" />
								Sending code...
							</div>
						{:else}
							Send verification code
						{/if}
					</button>
				{:else}
					<div>
						<label for="otp" class="mb-2 block text-sm font-medium text-slate-300"
							>Verification Code</label
						>
						<input
							type="text"
							id="otp"
							name="otp"
							oninput={handleInput}
							value={otp}
							maxlength="6"
							class="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-center font-mono text-2xl tracking-widest text-white placeholder-slate-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
							placeholder="000000"
							autocomplete="one-time-code"
							required
						/>
						{#if errors.otp}
							<p class="mt-2 text-sm text-red-400">{errors.otp}</p>
						{/if}
						<p class="mt-2 text-sm text-slate-400">
							Enter the 6-digit code sent to {email}
						</p>
					</div>

					<button
						type="submit"
						disabled={isLoading || !isOtpValid}
						class="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all duration-200 hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isLoading}
							<div class="flex items-center justify-center">
								<Loader2 class="mr-2 h-5 w-5 animate-spin" />
								Verifying...
							</div>
						{:else}
							Sign in
						{/if}
					</button>

					<button
						type="button"
						onclick={goBack}
						class="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
					>
						Back to email
					</button>

					<div class="text-center">
						<button
							type="button"
							onclick={sendOTP}
							disabled={isLoading}
							class="text-sm text-indigo-400 transition-colors hover:text-indigo-300 hover:underline disabled:text-slate-500"
						>
							Resend code
						</button>
					</div>
				{/if}
			</form>

			<div class="mt-6 text-center">
				<p class="text-sm text-slate-400">
					Prefer password?
					<a href="/auth/login" class="text-indigo-400 hover:text-indigo-300 hover:underline">
						Sign in with password
					</a>
				</p>
				<p class="mt-2 text-sm text-slate-400">
					Don't have an account?
					<a href="/auth/signup" class="text-indigo-400 hover:text-indigo-300 hover:underline">
						Sign up
					</a>
				</p>
			</div>
		</div>
	{/if}
</div>
