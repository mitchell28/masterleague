<script lang="ts">
	import { enhance } from '$app/forms';

	// Get data from props
	let { data, form } = $props();
	let stats = $derived(data.stats);

	// State for random multiplier
	let isUpdatingMultipliers = $state(false);
	let updateMessage = $state<string | null>(null);

	// Check form result for multiplier update
	$effect(() => {
		if (form?.success === true) {
			updateMessage = `✅ Successfully updated multipliers for matchweek ${stats.currentWeek}`;
		} else if (form?.success === false) {
			updateMessage = `❌ ${form.error || 'Failed to update multipliers'}`;
		}
	});
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
		<div class="flex gap-4">
			<a
				href="/admin/results"
				class="rounded-xl border border-green-600 bg-green-700 px-4 py-2 font-medium text-white transition-all hover:bg-green-600"
			>
				Enter Results
			</a>

			<form
				method="POST"
				action="?/updateMultipliers"
				use:enhance={() => {
					isUpdatingMultipliers = true;
					updateMessage = null;

					return async ({ result }) => {
						isUpdatingMultipliers = false;
					};
				}}
			>
				<button
					type="submit"
					disabled={isUpdatingMultipliers}
					class="rounded-xl border border-blue-600 bg-blue-700 px-4 py-2 font-medium text-white transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isUpdatingMultipliers ? 'Updating...' : 'Randomize Multipliers'}
				</button>
			</form>

			<form
				method="POST"
				action="?/updateAllMultipliers"
				use:enhance={() => {
					isUpdatingMultipliers = true;
					updateMessage = null;

					return async ({ result }) => {
						isUpdatingMultipliers = false;
					};
				}}
			>
				<button
					type="submit"
					disabled={isUpdatingMultipliers}
					class="rounded-xl border border-blue-600 bg-blue-700 px-4 py-2 font-medium text-white transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isUpdatingMultipliers ? 'Updating...' : 'Randomize All Multipliers'}
				</button>
			</form>
		</div>

		{#if updateMessage}
			<div class="mt-4 text-sm {updateMessage.includes('✅') ? 'text-green-400' : 'text-red-400'}">
				{updateMessage}
			</div>
		{/if}
	</div>
</div>
