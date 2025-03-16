<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Info } from '@lucide/svelte';

	let { children } = $props();
	// Using runes to access page data
	let data = $derived(page.data);
	let week = $derived(data?.week || 1);
	let weeks = $derived(data?.weeks || []);
	let currentWeek = $derived(data?.currentWeek || 1);

	// Change week from dropdown
	function changeWeek(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newWeek = parseInt(target.value);

		// Only navigate if actually changing weeks
		if (newWeek !== week) {
			goto(`/predictions/${newWeek}`, { replaceState: false });
		}
	}
</script>

<div class="container mx-auto max-w-6xl p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Week {week} Predictions</h1>
	</div>

	{#if week > currentWeek}
		<div class="mb-4 rounded-lg bg-blue-500/20 p-4 text-blue-100 shadow-lg">
			<div class="flex items-center gap-2">
				<Info class="size-5" />
				<span>
					You're viewing a future week. You can make predictions for any match with "upcoming"
					status. All upcoming matches should be available for prediction regardless of date.
				</span>
			</div>
		</div>
	{/if}

	<!-- Week navigation panel -->
	<div class="mb-8 rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<!-- Current week indicator -->
			<div>
				<span class="text-sm font-medium text-slate-300">Current League Week: {currentWeek}</span>
				{#if week !== currentWeek}
					<span class="ml-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-black">
						You're viewing week {week}
					</span>
				{:else}
					<span class="ml-2 rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-black">
						Current
					</span>
				{/if}
			</div>

			<!-- Week selector dropdown -->
			<div>
				<label for="week-selector" class="font-medium">Go to week:</label>
				<select
					id="week-selector"
					class="ml-2 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1 text-slate-100 focus:border-blue-400 focus:outline-none"
					onchange={changeWeek}
				>
					{#each weeks as weekNum}
						<option value={weekNum} selected={weekNum === week}>{weekNum}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- Slot for the page content -->
	{@render children()}
</div>
