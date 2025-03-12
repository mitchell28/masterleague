<script lang="ts">
	// Get data from props
	let { data } = $props();
	let stats = $derived(data.stats);
</script>

<div class="container mx-auto max-w-6xl p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Admin Dashboard</h1>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
			<h3 class="text-xl font-semibold">Current Week</h3>
			<p class="mt-2 text-3xl font-bold">{stats.currentWeek}</p>
		</div>

		<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
			<h3 class="text-xl font-semibold">Fixtures This Week</h3>
			<p class="mt-2 text-3xl font-bold">{stats.fixturesThisWeek}</p>
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

	<div class="mt-8 rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
		<h3 class="mb-4 text-xl font-semibold">Quick Actions</h3>
		<div class="flex flex-wrap gap-4">
			<a
				href="/admin/results"
				class="rounded-xl border border-green-600 bg-green-700 px-4 py-2 font-medium text-white transition-all hover:bg-green-600"
			>
				Enter Results
			</a>
		</div>
	</div>
</div>
