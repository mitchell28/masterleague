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

<div class=" mx-auto mt-22">
	<!-- Main Header with clean geometric design -->
	<div class="relative mb-8">
		<div class="font-display relative h-[120px] w-full overflow-hidden bg-[#020618]">
			<!-- Accent top bar -->
			<div class="mx-auto mt-6 max-w-6xl">
				<!-- Main content area -->
				<div class="relative flex h-full items-center justify-between px-4 py-4">
					<div>
						<h1 class="text-3xl font-bold text-white">{userName}'s Predictions</h1>
						<div class="mt-2 flex items-center gap-3">
							<a
								href="/leaderboard"
								class="inline-flex items-center text-slate-300 hover:text-white"
							>
								<ChevronLeft class="mr-1 h-4 w-4" />
								Back to Leaderboard
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-4">
		<!-- Week navigation panel -->
		{#if availableWeeks && availableWeeks.length > 0}
			<div class="mb-8 rounded-xl border border-slate-700 bg-slate-800/70 p-4 shadow-lg">
				<div class="flex flex-nowrap items-center justify-between">
					<div class="flex items-center gap-2">
						<button
							onclick={goToPreviousWeek}
							class="cursor-pointer rounded-md bg-slate-700 px-2 py-1 text-white hover:bg-slate-600 disabled:opacity-50"
							disabled={availableWeeks.indexOf(weekId) === 0}
						>
							←
						</button>

						<span class="font-medium whitespace-nowrap text-white">Week {weekId}</span>

						<button
							onclick={goToNextWeek}
							class="cursor-pointer rounded-md bg-slate-700 px-2 py-1 text-white hover:bg-slate-600 disabled:opacity-50"
							disabled={availableWeeks.indexOf(weekId) === availableWeeks.length - 1}
						>
							→
						</button>

						<span class="hidden text-xs text-slate-400 sm:inline">
							{availableWeeks.indexOf(weekId) + 1} of {availableWeeks.length}
						</span>
					</div>

					<div class="flex items-center">
						<label for="week-selector" class="mr-1 text-sm font-medium whitespace-nowrap text-white"
							>Jump to:</label
						>
						<select
							id="week-selector"
							class="rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-white focus:border-blue-400 focus:outline-none"
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

		<!-- Render children with optional chaining to handle null/undefined -->
		{@render children?.()}
	</div>
</div>
