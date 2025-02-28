<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let initStatus = '';
	let initError = '';

	async function initializeDatabase() {
		try {
			initStatus = 'Initializing...';
			initError = '';

			const response = await fetch('/api/init');
			const data = await response.json();

			if (data.success) {
				initStatus = 'Database initialized successfully!';
				setTimeout(() => {
					initStatus = '';
				}, 3000);
			} else {
				initError = data.message || 'Failed to initialize database';
			}
		} catch (err) {
			initError = 'An error occurred while initializing database';
			console.error(err);
		}
	}

	onMount(() => {
		// Auto-initialize on admin page load
		initializeDatabase();
	});
</script>

<div class="container mx-auto p-4">
	<header class="mb-6">
		<h1 class="h1">Admin Dashboard</h1>
		<p class="text-gray-400">Manage fixtures, results, and users</p>
	</header>

	<div class="card variant-glass mb-6 p-4">
		<nav class="flex gap-4">
			<a
				href="/admin"
				class="rounded-md bg-gray-700 p-2 {$page.url.pathname === '/admin' ? 'variant-filled' : ''}"
			>
				Dashboard
			</a>
			<a
				href="/admin/results"
				class="rounded-md bg-gray-700 p-2 {$page.url.pathname.startsWith('/admin/results')
					? 'variant-filled'
					: ''}"
			>
				Enter Results
			</a>
			<button on:click={initializeDatabase} class="rounded-md bg-blue-700 p-2">
				Initialize Database
			</button>

			{#if initStatus}
				<span class="p-2 text-green-400">{initStatus}</span>
			{/if}

			{#if initError}
				<span class="p-2 text-red-400">{initError}</span>
			{/if}
		</nav>
	</div>

	<main>
		<slot />
	</main>
</div>
