<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { authResetPasswordSchema, passwordValidation } from '$lib/validation/auth-schemas';
	import { Loader2, CheckCircle } from '@lucide/svelte';
	import logo from '$lib/assets/logo/masterleague.svg';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		validators: zod(authResetPasswordSchema)
	});

	// Use centralized validation functions with $derived
	const formIsValid = $derived(
		passwordValidation.isFormValid($form.newPassword, $form.confirmPassword)
	);
	const passwordStrengthMessage = $derived(
		passwordValidation.getPasswordStrengthMessage($form.newPassword)
	);
	const passwordMatchMessage = $derived(
		passwordValidation.getPasswordMatchMessage($form.newPassword, $form.confirmPassword)
	);
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
					RESET YOUR PASSWORD
				</h1>
				<p class="mt-2 text-sm text-slate-400">
					Looking to sign in?
					<a
						href="/auth/login"
						class="text-accent hover:text-accent/80 font-medium transition-colors"
					>
						Sign in here
					</a>
				</p>
			</div>

			<!-- Success message -->
			{#if data.success}
				<div class="mb-6 border border-green-500/30 bg-green-500/10 p-4">
					<div class="flex items-center">
						<CheckCircle class="mr-3 h-5 w-5 text-green-400" />
						<div>
							<p class="text-sm font-medium text-green-400">Password reset successful!</p>
							<p class="mt-1 text-sm text-green-300">
								Your password has been updated successfully. You can now sign in with your new
								password.
							</p>
						</div>
					</div>
					<div class="mt-4">
						<a
							href="/auth/login"
							class="bg-accent hover:bg-accent/90 focus:ring-accent inline-flex items-center px-4 py-2 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
						>
							Continue to Sign In
						</a>
					</div>
				</div>
			{/if}

			<!-- Error message -->
			{#if $message}
				<div class="mb-6 border border-red-500/30 bg-red-500/10 p-4">
					<p class="text-sm text-red-400">{$message}</p>
				</div>
			{/if}

			<!-- Password Reset form - only show if not successful -->
			{#if !data.success}
				<form method="POST" use:enhance class="space-y-5">
					<div>
						<label for="newPassword" class="block text-sm font-medium text-slate-300"
							>New Password</label
						>
						<input
							type="password"
							id="newPassword"
							name="newPassword"
							bind:value={$form.newPassword}
							class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
							class:border-red-500={$errors.newPassword || passwordStrengthMessage.type === 'error'}
							class:focus:border-red-500={$errors.newPassword ||
								passwordStrengthMessage.type === 'error'}
							class:focus:ring-red-500={$errors.newPassword ||
								passwordStrengthMessage.type === 'error'}
							class:border-green-500={passwordStrengthMessage.type === 'success'}
							class:focus:border-green-500={passwordStrengthMessage.type === 'success'}
							class:focus:ring-green-500={passwordStrengthMessage.type === 'success'}
							autocomplete="new-password"
							placeholder="Enter your new password (min 8 characters)"
						/>
						{#if $errors.newPassword}
							<p class="mt-2 text-sm text-red-400">{$errors.newPassword}</p>
						{:else if passwordStrengthMessage.message}
							<p
								class="mt-2 text-sm"
								class:text-red-400={passwordStrengthMessage.type === 'error'}
								class:text-green-400={passwordStrengthMessage.type === 'success'}
							>
								{passwordStrengthMessage.message}
							</p>
						{/if}
					</div>

					<div>
						<label for="confirmPassword" class="block text-sm font-medium text-slate-300"
							>Confirm Password</label
						>
						<input
							type="password"
							id="confirmPassword"
							name="confirmPassword"
							bind:value={$form.confirmPassword}
							class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
							class:border-red-500={$errors.confirmPassword ||
								passwordMatchMessage.type === 'error'}
							class:focus:border-red-500={$errors.confirmPassword ||
								passwordMatchMessage.type === 'error'}
							class:focus:ring-red-500={$errors.confirmPassword ||
								passwordMatchMessage.type === 'error'}
							class:border-green-500={passwordMatchMessage.type === 'success'}
							class:focus:border-green-500={passwordMatchMessage.type === 'success'}
							class:focus:ring-green-500={passwordMatchMessage.type === 'success'}
							autocomplete="new-password"
							placeholder="Confirm your new password"
						/>
						{#if $errors.confirmPassword}
							<p class="mt-2 text-sm text-red-400">{$errors.confirmPassword}</p>
						{:else if passwordMatchMessage.message}
							<p
								class="mt-2 text-sm"
								class:text-red-400={passwordMatchMessage.type === 'error'}
								class:text-green-400={passwordMatchMessage.type === 'success'}
							>
								{passwordMatchMessage.message}
							</p>
						{/if}
					</div>

					<button
						type="submit"
						disabled={$submitting || !formIsValid}
						class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0D1326] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if $submitting}
							<div class="flex items-center justify-center">
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Updating Password...
							</div>
						{:else if !formIsValid}
							Complete Form to Reset Password
						{:else}
							Reset Password
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
