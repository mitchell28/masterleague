<script lang="ts">
	import { enhance } from '$app/forms';
	import { XCircle } from '@lucide/svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div
	class="flex min-h-[calc(100vh-10rem)] items-center justify-center bg-gray-50 p-4 dark:bg-gray-900"
>
	<div
		class="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800"
	>
		<header class="mb-6 text-center">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Login/Register</h1>
			<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
				Enter your credentials to continue
			</p>
		</header>

		<section>
			<form method="post" action="?/login" use:enhance class="space-y-6">
				<div>
					<label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>Username</label
					>
					<input
						class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
						id="username"
						name="username"
						placeholder="Enter username"
						autocomplete="username"
						required
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>Password</label
					>
					<input
						class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
						id="password"
						type="password"
						name="password"
						placeholder="Enter password"
						autocomplete="current-password"
						required
					/>
				</div>

				<div class="flex gap-4 pt-2">
					<button
						class="w-1/2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-600"
					>
						Login
					</button>
					<button
						formaction="?/register"
						class="w-1/2 rounded-md bg-gray-600 px-4 py-2 font-medium text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:hover:bg-gray-600"
					>
						Register
					</button>
				</div>
			</form>

			{#if form?.message}
				<div class="mt-6 rounded-md bg-red-50 p-4 dark:bg-red-900/30">
					<div class="flex">
						<XCircle class="h-5 w-5 text-red-400" />
						<p class="ml-3 text-sm text-red-700 dark:text-red-200">{form.message}</p>
					</div>
				</div>
			{/if}
		</section>
	</div>
</div>
