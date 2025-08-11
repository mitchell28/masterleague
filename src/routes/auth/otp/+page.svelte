<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authClient } from '$lib/client/auth-client';
	import { z } from 'zod';
	import { Loader2 } from '@lucide/svelte';
	import logo from '$lib/assets/logo/masterleague.svg';

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

			console.log(`🔐 [Client] Requesting OTP for email: ${email}`);

			await authClient.emailOtp.sendVerificationOtp({
				email,
				type: 'sign-in'
			});

			console.log(`✅ [Client] OTP request successful for: ${email}`);
			step = 'otp';
			successMessage = `We've sent a 6-digit code to ${email}`;
		} catch (error) {
			console.error(`❌ [Client] Failed to send OTP to ${email}:`, error);

			// Log more details about the error
			if (error instanceof Error) {
				console.error(`❌ [Client] Error details:`, {
					message: error.message,
					stack: error.stack
				});
			}

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

			console.log(`🔐 [Client] Verifying OTP for email: ${email}, OTP: ${otp}`);

			await authClient.signIn.emailOtp(
				{
					email,
					otp
				},
				{
					onSuccess: () => {
						console.log(`✅ [Client] OTP verification successful for: ${email}`);
						goto(redirectTo);
					},
					onError: (ctx) => {
						console.error(`❌ [Client] OTP verification failed for ${email}:`, ctx.error);
						errorMessage = ctx.error.message;
					}
				}
			);
		} catch (error) {
			console.error(`❌ [Client] OTP verification error for ${email}:`, error);
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

<div class="flex min-h-screen">
	{#if $session.data}
		<!-- Already logged in state - centered layout -->
		<div class="flex w-full items-center justify-center">
			<div
				class="border-accent/30 w-full max-w-md border p-8 text-center"
				style="clip-path: polygon(8% 0%, 100% 0%, 100% 85%, 92% 100%, 0% 100%, 0% 15%);"
			>
				<div class="mb-6">
					<img src={logo} height="64" alt="Master League Logo" class="mx-auto mb-4 h-16" />
				</div>
				<h1 class="font-display mb-4 text-2xl font-bold text-white">Welcome back!</h1>
				<p class="mb-6 text-slate-300">Hello, {$session?.data?.user.name}</p>
				<button
					onclick={async () => {
						await authClient.signOut();
					}}
					class="w-full bg-red-600 px-4 py-3 font-medium text-white transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
					style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
				>
					Sign Out
				</button>
			</div>
		</div>
	{:else}
		<!-- OTP form - centered -->
		<div class="flex w-full flex-col items-center justify-center px-8 py-12">
			<div
				class="w-full max-w-md bg-slate-900/50 p-8 backdrop-blur-sm"
				style="clip-path: polygon(10% 0%, 100% 0%, 100% 94%, 90% 100%, 0% 100%, 0% 6%);"
			>
				<!-- Logo -->
				<div class="mb-8 text-center">
					<img src={logo} height="48" alt="Master League Logo" class="mx-auto mb-4 h-12" />
					<h1 class="font-display text-3xl font-bold tracking-tight text-white">
						{step === 'email' ? 'Sign in with one time code' : 'Enter verification code'}
					</h1>
					<p class="mt-2 text-sm text-slate-400">
						{step === 'email' ? "We'll send you a secure code" : `Code sent to ${email}`}
					</p>
				</div>

				{#if successMessage}
					<div
						class="mb-6 border border-green-500/30 bg-green-500/10 p-4"
						style="clip-path: polygon(8% 0%, 100% 0%, 100% 85%, 92% 100%, 0% 100%, 0% 15%);"
					>
						<p class="text-sm text-green-400">{successMessage}</p>
					</div>
				{/if}

				{#if errorMessage}
					<div
						class="mb-6 border border-red-500/30 bg-red-500/10 p-4"
						style="clip-path: polygon(8% 0%, 100% 0%, 100% 85%, 92% 100%, 0% 100%, 0% 15%);"
					>
						<p class="text-sm text-red-400">{errorMessage}</p>
					</div>
				{/if}

				<form onsubmit={onSubmit} class="space-y-5">
					{#if step === 'email'}
						<div>
							<label for="email" class="block text-sm font-medium text-slate-300"
								>Email address</label
							>
							<input
								type="email"
								id="email"
								name="email"
								oninput={handleInput}
								value={email}
								class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
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
					{:else}
						<div>
							<label for="otp" class="block text-sm font-medium text-slate-300"
								>Verification Code</label
							>
							<input
								type="text"
								id="otp"
								name="otp"
								oninput={handleInput}
								value={otp}
								maxlength="6"
								class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-center font-mono text-2xl tracking-widest text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
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
								disabled={isLoading}
								class="text-accent hover:text-accent/80 text-sm transition-colors hover:underline disabled:text-slate-500"
							>
								Resend code
							</button>
						</div>
					{/if}
				</form>

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
	{/if}
</div>
