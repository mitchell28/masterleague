<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Info } from '@lucide/svelte';

	// Correct way to handle slots in SvelteKit 5
	let { children } = $props();

	// Using runes to access page data
	let { weeks, currentWeek } = $derived(page.data);
	let week = $derived(page.params.week ? parseInt(page.params.week) : currentWeek);

	// Change week from dropdown
	function changeWeek(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newWeek = parseInt(target.value);

		// Only navigate if actually changing weeks
		if (newWeek !== week) {
			goto(`/predictions/${newWeek}`);
		}
	}

	// Fix the condition to correctly check for future weeks
	let showFutureWeekMessage = $derived(parseInt(week) > parseInt(currentWeek));
</script>

<div class="container mx-auto max-w-6xl p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Week {week} Predictions</h1>
	</div>

	{#if showFutureWeekMessage}
		<div class="mb-4 rounded-lg bg-blue-500/20 p-4 text-blue-100 shadow-lg">
			<div class="flex items-center gap-2">
				<Info class="size-5" />
				<span>
					You're viewing a future week. You can make predictions for any match with "upcoming"
					status.
				</span>
			</div>
		</div>
	{/if}

	<!-- Week navigation panel - optimized -->
	<div class="mb-8 rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<!-- Current week indicator -->
			<div>
				<span class="text-sm font-medium text-slate-300">Current League Week: {currentWeek}</span>
				{#if week !== currentWeek}
					<span class="ml-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-black">
						Week {week}
					</span>
				{:else}
					<span class="ml-2 rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-black">
						Current
					</span>
				{/if}
			</div>

			<!-- Week selector dropdown - optimized -->
			<div>
				<label for="week-selector" class="font-medium">Go to week:</label>
				<select
					id="week-selector"
					class="ml-2 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1 text-slate-100 focus:border-blue-400 focus:outline-none"
					onchange={changeWeek}
					value={week}
				>
					{#each weeks as weekNum}
						<option value={weekNum}>{weekNum}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- Correctly use the children slot without optional chaining -->
	{@render children()}
</div>
