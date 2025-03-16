<script lang="ts">
	// Get data from props
	let { data } = $props();
	let stats = $derived(data.stats);
</script>

<div class="container mx-auto max-w-6xl p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Admin Dashboard</h1>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
			<h3 class="text-xl font-semibold">Current Week</h3>
			<p class="mt-2 text-3xl font-bold">{stats.currentWeek}</p>
		</div>

		<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
			<h3 class="text-xl font-semibold">Total Users</h3>
			<p class="mt-2 text-3xl font-bold">{stats.totalUsers}</p>
		</div>

		<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
			<h3 class="text-xl font-semibold">Total Predictions</h3>
			<p class="mt-2 text-3xl font-bold">{stats.totalPredictions}</p>
		</div>
	</div>
</div>
