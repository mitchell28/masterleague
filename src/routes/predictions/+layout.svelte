<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Info } from '@lucide/svelte';

	// Correct way to handle slots in SvelteKit 5
	let { children } = $props();

	// Using runes to access page data
	let { weeks, currentWeek } = $derived(page.data);

	// Enhanced week parsing with better type safety - Svelte 5 syntax
	let week = $derived(
		page.params.week
			? isNaN(parseInt(page.params.week, 10))
				? currentWeek
				: parseInt(page.params.week, 10)
			: currentWeek
	);

	// State for managing week transitions and validation
	let isValidWeek = $state(true);
	let weekStatus = $state<'current' | 'past' | 'future'>('current');
	let showFutureWeekMessage = $state(false);

	// Effect to handle week validation and status updates
	$effect(() => {
		if (weeks && week !== undefined && currentWeek !== undefined) {
			// Both week and currentWeek should be numbers at this point
			const weekNum = Number(week);
			const currentWeekNum = Number(currentWeek);

			// Check if week is valid (exists in weeks array)
			isValidWeek = weeks.includes(weekNum);

			// Determine week status relative to current week
			if (weekNum > currentWeekNum) {
				weekStatus = 'future';
				showFutureWeekMessage = true;
			} else if (weekNum < currentWeekNum) {
				weekStatus = 'past';
				showFutureWeekMessage = false;
			} else {
				weekStatus = 'current';
				showFutureWeekMessage = false;
			}
		}
	});

	// Effect to handle invalid week navigation
	$effect(() => {
		if (!isValidWeek && weeks && weeks.length > 0 && currentWeek !== undefined) {
			// Redirect to current week if invalid week is accessed
			console.warn(`Invalid week ${week}, redirecting to current week ${currentWeek}`);
			goto(`/predictions/${currentWeek}`, { replaceState: true });
		}
	});

	// Enhanced week change handler with validation
	function changeWeek(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newWeek = parseInt(target.value, 10);

		// Validate the new week
		if (isNaN(newWeek)) {
			console.error('Invalid week selected');
			return;
		}

		// Only navigate if actually changing weeks and week is valid
		if (newWeek !== week && weeks.includes(newWeek)) {
			goto(`/predictions/${newWeek}`);
		}
	}
</script>

<div class="container mx-auto mt-26 max-w-6xl p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Week {week} Predictions</h1>
	</div>

	{#if showFutureWeekMessage}
		<div class="mb-4 rounded-lg bg-blue-500/20 p-4 text-blue-100 shadow-lg">
			<div class="flex items-center gap-2">
				<Info class="size-5" />
				<span>
					You're viewing a future week (Week {week}). You can make predictions for any match with
					"upcoming" status.
				</span>
			</div>
		</div>
	{/if}

	<!-- Week navigation panel - enhanced with status indicators -->
	<div class="mb-8 rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<!-- Enhanced current week indicator with status -->
			<div>
				<span class="text-sm font-medium text-slate-300">Current League Week: {currentWeek}</span>
				{#if weekStatus === 'current'}
					<span class="ml-2 rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-black">
						Current
					</span>
				{:else if weekStatus === 'future'}
					<span class="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
						Future - Week {week}
					</span>
				{:else if weekStatus === 'past'}
					<span class="ml-2 rounded-full bg-gray-500 px-2 py-0.5 text-xs font-bold text-white">
						Past - Week {week}
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
