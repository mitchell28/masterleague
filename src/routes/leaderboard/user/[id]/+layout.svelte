<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ChevronLeft } from '@lucide/svelte';

	// Get the slot children
	let { children } = $props();

	// Access page data
	let data = $derived(page.data);
	let userId = $derived(page.params.id);
	let userName = $derived(data?.user?.name || 'User');
	let weekId = $derived(data?.weekData?.weekId || 1);
	let availableWeeks = $derived(data?.availableWeeks || []);

	// Change week from dropdown
	function changeWeek(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newWeek = parseInt(target.value);

		// Only navigate if actually changing weeks
		if (newWeek !== weekId) {
			goto(`/leaderboard/user/${userId}/week/${newWeek}`);
		}
	}
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<div class="mb-6">
		<a href="/leaderboard" class="mb-4 inline-flex items-center text-slate-300 hover:text-white">
			<ChevronLeft class="mr-1 h-4 w-4" />
			Back to Leaderboard
		</a>
		<h1 class="mb-2 text-3xl font-bold text-white">
			<span class="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
				{userName}'s Predictions
			</span>
		</h1>
	</div>

	<!-- Week navigation panel -->
	{#if availableWeeks && availableWeeks.length > 0}
		<div class="mb-8 rounded-xl border border-slate-700 bg-slate-800/70 p-4 shadow-lg">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<!-- Current week indicator -->
				<div>
					<span class="text-sm font-medium text-white">Viewing Week: {weekId}</span>
				</div>

				<!-- Week selector dropdown -->
				<div>
					<label for="week-selector" class="font-medium text-white">Go to week:</label>
					<select
						id="week-selector"
						class="ml-2 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1 text-white focus:border-blue-400 focus:outline-none"
						onchange={changeWeek}
						value={weekId}
					>
						{#each availableWeeks as weekNum}
							<option value={weekNum}>{weekNum}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>
	{/if}

	<!-- Render children -->
	{@render children()}
</div>
