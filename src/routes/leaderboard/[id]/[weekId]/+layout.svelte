<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ChevronLeft } from '@lucide/svelte';
	import WeekSelector from '$lib/components/WeekSelector.svelte';

	// Get the slot children
	let { children } = $props();

	// Access page data
	let data = $derived(page.data);
	let userId = $derived(page.params.id);
	let userName = $derived(data?.leaderboardUser?.name || 'User');
	let weekId = $derived(data?.weekData?.weekId || 1);
	let availableWeeks = $derived(data?.availableWeeks || []);
	let stats = $derived(data?.stats);

	// Week navigation handlers
	function handleWeekChange(newWeek: number) {
		if (newWeek !== weekId) {
			goto(`/leaderboard/${userId}/${newWeek}`);
		}
	}

	function handleNavigate(direction: 'prev' | 'next') {
		const currentIndex = availableWeeks.indexOf(weekId);
		let targetWeek: number;

		if (direction === 'prev') {
			targetWeek = availableWeeks[currentIndex - 1];
		} else {
			targetWeek = availableWeeks[currentIndex + 1];
		}

		if (targetWeek && availableWeeks.includes(targetWeek)) {
			goto(`/leaderboard/${userId}/${targetWeek}`);
		}
	}
</script>

<div class="mx-auto mt-22">
	<!-- Main Header with title and week selector -->
	<div class="relative mb-8">
		<div class="font-display relative w-full overflow-hidden bg-slate-900">
			<div class="mx-auto max-w-7xl px-4 py-10 sm:px-6">
				<!-- Title and Week Navigation Row -->
				<div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 class="text-2xl font-bold text-white sm:text-3xl">{userName}'s Predictions</h1>
						<div class="mt-2 flex items-center gap-3">
							<a
								href="/leaderboard"
								class="inline-flex items-center text-sm font-medium text-slate-300 hover:text-white"
							>
								<ChevronLeft class="mr-1 h-4 w-4" />
								Back to Leaderboard
							</a>
						</div>
					</div>

					<!-- Week Selector Component -->
					<div class="w-full sm:w-auto">
						<WeekSelector
							weeks={availableWeeks}
							currentWeek={weekId}
							week={weekId}
							onWeekChange={handleWeekChange}
							onNavigate={handleNavigate}
						/>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Weekly Stats Grid -->
	{#if stats}
		<div class="mx-auto mb-8 max-w-7xl px-4 sm:px-6">
			<div class="grid grid-cols-3 gap-4">
				<div class="border-b-accent border-b-4 bg-slate-900 p-4">
					<div class="text-accent text-lg font-bold sm:text-2xl">{stats.correctScorelines}</div>
					<div class="text-xs text-slate-400 sm:text-sm">Perfect Scores</div>
				</div>

				<div class="border-b-4 border-b-blue-500 bg-slate-900 p-4">
					<div class="text-lg font-bold text-blue-400 sm:text-2xl">{stats.correctOutcomes}</div>
					<div class="text-xs text-slate-400 sm:text-sm">Correct</div>
				</div>

				<div class="border-b-4 border-b-red-500 bg-slate-900 p-4">
					<div class="text-lg font-bold text-red-400 sm:text-2xl">{stats.incorrectPredictions}</div>
					<div class="text-xs text-slate-400 sm:text-sm">Incorrect</div>
				</div>
			</div>
		</div>
	{/if}

	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<!-- Render children -->
		{@render children?.()}
	</div>
</div>
