<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { authSignupSchema } from '$lib/validation/auth-schemas';
	import { Loader2 } from '@lucide/svelte';
	import logo from '$lib/assets/logo/masterleague.svg';

	const { data } = $props();

	const { form, errors, message, submitting, enhance } = superForm(data.form, {
		validators: zod(authSignupSchema),
		onResult: ({ result }) => {
			if (result.type === 'redirect') {
				// Store credentials for later use after email verification
				if (typeof sessionStorage !== 'undefined') {
					sessionStorage.setItem(
						'signupData',
						JSON.stringify({
							email: $form.email,
							password: $form.password
						})
					);
				}
			}
		}
	});
</script>

<div class="flex min-h-screen">
	<!-- Signup form - centered -->
	<div class="flex w-full flex-col items-center justify-center p-8 md:mt-22">
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
					Create Account
				</h1>
				<p class="mt-2 text-sm text-slate-400">
					Already have an account?
					<a
						href="/auth/login"
						class="text-accent hover:text-accent/80 font-medium transition-colors"
					>
						Sign in
					</a>
				</p>
			</div>

			{#if $message}
				<div class="mb-6 border border-red-500/30 bg-red-500/10 p-4">
					<p class="text-sm text-red-400">{$message}</p>
				</div>
			{/if}

			<form method="POST" use:enhance class="space-y-5">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label for="firstName" class="block text-sm font-medium text-slate-300"
							>First Name</label
						>
						<input
							type="text"
							id="firstName"
							name="firstName"
							bind:value={$form.firstName}
							class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
							class:border-red-500={$errors.firstName}
							class:focus:border-red-500={$errors.firstName}
							class:focus:ring-red-500={$errors.firstName}
							autocomplete="given-name"
							placeholder="Enter your first name"
							required
						/>
						{#if $errors.firstName}
							<p class="mt-2 text-sm text-red-400">{$errors.firstName}</p>
						{/if}
					</div>

					<div>
						<label for="lastName" class="block text-sm font-medium text-slate-300">Last Name</label>
						<input
							type="text"
							id="lastName"
							name="lastName"
							bind:value={$form.lastName}
							class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
							class:border-red-500={$errors.lastName}
							class:focus:border-red-500={$errors.lastName}
							class:focus:ring-red-500={$errors.lastName}
							autocomplete="family-name"
							placeholder="Enter your last name"
							required
						/>
						{#if $errors.lastName}
							<p class="mt-2 text-sm text-red-400">{$errors.lastName}</p>
						{/if}
					</div>
				</div>

				<div>
					<label for="email" class="block text-sm font-medium text-slate-300">Email address</label>
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
						required
					/>
					{#if $errors.email}
						<p class="mt-2 text-sm text-red-400">{$errors.email}</p>
					{/if}
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-slate-300">Password</label>
					<input
						type="password"
						id="password"
						name="password"
						bind:value={$form.password}
						class="focus:border-accent focus:ring-accent/20 mt-1 block w-full border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-white placeholder-slate-400 transition-colors focus:ring-2 focus:outline-none"
						class:border-red-500={$errors.password}
						class:focus:border-red-500={$errors.password}
						class:focus:ring-red-500={$errors.password}
						autocomplete="new-password"
						placeholder="Enter your password"
						required
					/>
					{#if $errors.password}
						<p class="mt-2 text-sm text-red-400">{$errors.password}</p>
					{/if}
				</div>

				<button
					type="submit"
					disabled={$submitting}
					class="bg-accent hover:bg-accent/90 focus:ring-accent w-full px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if $submitting}
						<div class="flex items-center justify-center">
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Creating account...
						</div>
					{:else}
						Create Account
					{/if}
				</button>
			</form>
		</div>
	</div>
</div>
