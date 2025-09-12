<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { otpRequestSchema } from '$lib/validation/auth-schemas';
	import { Loader2, CheckCircle, Mail } from '@lucide/svelte';
	import logo from '$lib/assets/logo/masterleague.svg';

	const { data } = $props();

	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		validators: zod(otpRequestSchema)
	});
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
					REQUEST TO RESET YOUR PASSWORD
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
			{#if data.success && data.email}
				<div class="mb-6 border border-green-500/30 bg-green-500/10 p-4">
					<div class="flex items-center">
						<CheckCircle class="mr-3 h-5 w-5 text-green-400" />
						<div>
							<p class="text-sm font-medium text-green-400">Reset email sent!</p>
							<p class="mt-1 text-sm text-green-300">
								We've sent a password reset link to <strong>{data.email}</strong>. Check your email
								and follow the instructions to reset your password.
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Error message -->
			{#if $message}
				<div class="mb-6 border border-red-500/30 bg-red-500/10 p-4">
					<div class="flex items-center">
						<Mail class="mr-3 h-5 w-5 text-red-400" />
						<p class="text-sm text-red-400">{$message}</p>
					</div>
				</div>
			{/if}

			<!-- Password reset form -->
			{#if !data.success}
				<form method="POST" use:enhance class="space-y-5">
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
							class:focus:border-red-500={$errors.email}
							class:focus:ring-red-500={$errors.email}
							autocomplete="email"
							placeholder="Enter your email"
						/>
						{#if $errors.email}
							<p class="mt-2 text-sm text-red-400">{$errors.email}</p>
						{/if}
					</div>

					<button
						type="submit"
						disabled={$submitting}
						class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0D1326] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if $submitting}
							<div class="flex items-center justify-center">
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Sending Request...
							</div>
						{:else}
							Send Reset Link
						{/if}
					</button>
				</form>
			{:else}
				<!-- Success state actions -->
				<div class="space-y-4">
					<a
						href="/auth/login"
						class="bg-accent hover:bg-accent/90 focus:ring-accent block w-full px-4 py-2.5 text-center text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0D1326] focus:outline-none"
					>
						Back to Sign In
					</a>
					<button
						onclick={() => (window.location.href = '/auth/request-password-reset')}
						class="w-full border border-slate-600 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700/50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-[#0D1326] focus:outline-none"
					>
						Send Another Reset Link
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
