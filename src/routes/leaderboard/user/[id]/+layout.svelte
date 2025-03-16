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
			goto(`/leaderboard/user/${userId}/${newWeek}`);
		}
	}

	// Navigate to previous week
	function goToPreviousWeek() {
		const currentIndex = availableWeeks.indexOf(weekId);
		if (currentIndex > 0) {
			goto(`/leaderboard/user/${userId}/${availableWeeks[currentIndex - 1]}`);
		}
	}

	// Navigate to next week
	function goToNextWeek() {
		const currentIndex = availableWeeks.indexOf(weekId);
		if (currentIndex < availableWeeks.length - 1) {
			goto(`/leaderboard/user/${userId}/${availableWeeks[currentIndex + 1]}`);
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
				<!-- Week navigation controls -->
				<div class="flex items-center gap-2">
					<button
						onclick={goToPreviousWeek}
						class="cursor-pointer rounded-md bg-slate-700 px-3 py-1 text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={availableWeeks.indexOf(weekId) === 0}
					>
						← Previous
					</button>

					<div class="mx-2 text-center">
						<span class="font-medium text-white">Week {weekId}</span>
						<p class="text-xs text-slate-400">
							{availableWeeks.length > 0
								? `${availableWeeks.indexOf(weekId) + 1} of ${availableWeeks.length}`
								: 'No weeks available'}
						</p>
					</div>

					<button
						onclick={goToNextWeek}
						class="cursor-pointer rounded-md bg-slate-700 px-3 py-1 text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={availableWeeks.indexOf(weekId) === availableWeeks.length - 1}
					>
						Next →
					</button>
				</div>

				<!-- Week selector dropdown -->
				<div>
					<label for="week-selector" class="font-medium text-white">Jump to week:</label>
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
