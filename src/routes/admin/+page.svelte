<script lang="ts">
	import { onMount } from 'svelte';

	let stats = {
		totalUsers: 0,
		totalPredictions: 0,
		currentWeek: 0,
		fixturesThisWeek: 0
	};

	let loading = true;

	onMount(async () => {
		try {
			const response = await fetch('/api/admin/stats');
			const data = await response.json();

			if (data.success) {
				stats = data.stats;
			}
		} catch (error) {
			console.error('Failed to load stats', error);
		} finally {
			loading = false;
		}
	});
</script>

<div class="space-y-6">
	<h2 class="h2">Dashboard</h2>

	{#if loading}
		<div class="card p-4">
			<p>Loading stats...</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="card variant-filled-primary p-6">
				<h3 class="h3">Current Week</h3>
				<p class="text-3xl font-bold">{stats.currentWeek}</p>
			</div>

			<div class="card variant-filled-secondary p-6">
				<h3 class="h3">Fixtures This Week</h3>
				<p class="text-3xl font-bold">{stats.fixturesThisWeek}</p>
			</div>

			<div class="card variant-filled-tertiary p-6">
				<h3 class="h3">Total Users</h3>
				<p class="text-3xl font-bold">{stats.totalUsers}</p>
			</div>

			<div class="card variant-filled-success p-6">
				<h3 class="h3">Total Predictions</h3>
				<p class="text-3xl font-bold">{stats.totalPredictions}</p>
			</div>
		</div>

		<div class="card p-6">
			<h3 class="h3 mb-4">Quick Actions</h3>
			<div class="flex flex-wrap gap-4">
				<a href="/admin/fixtures" class="btn variant-filled">Manage Fixtures</a>
				<a href="/admin/results" class="btn variant-filled-secondary">Enter Results</a>
			</div>
		</div>
	{/if}
</div>
