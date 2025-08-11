<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Info } from '@lucide/svelte';
	import WeekSelector from './components/WeekSelector.svelte';

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

	$inspect('Current week:', currentWeek, 'Selected week:', week);

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

	// Week navigation handlers
	function handleWeekChange(newWeek: number) {
		if (newWeek !== week && weeks.includes(newWeek)) {
			goto(`/predictions/${newWeek}`);
		}
	}

	function handleNavigate(direction: 'prev' | 'next') {
		const targetWeek = direction === 'prev' ? week - 1 : week + 1;
		if (weeks.includes(targetWeek)) {
			goto(`/predictions/${targetWeek}`);
		}
	}
</script>

<div class="mx-auto mt-22">
	<!-- Main Header with clean geometric design -->
	<div class="relative">
		<div class="font-display mb-6 w-full overflow-hidden bg-slate-900">
			<!-- Accent top bar -->
			<div class="mx-auto my-6 max-w-6xl">
				<!-- Main content area -->
				<div class="relative flex h-full items-center justify-between px-4 py-4">
					<div>
						<h1 class="text-3xl font-bold text-white">Week {week}</h1>
						<div class="mt-2 flex items-center gap-3">
							<span class="text-sm font-medium text-slate-300"
								>Current League Week: {currentWeek}</span
							>
							{#if weekStatus === 'current'}
								<span class="bg-accent rounded px-3 py-1 text-xs font-bold text-black">
									CURRENT
								</span>
							{:else if weekStatus === 'future'}
								<span class="rounded bg-blue-500 px-3 py-1 text-xs font-bold text-white">
									FUTURE
								</span>
							{:else if weekStatus === 'past'}
								<span class="rounded bg-gray-500 px-3 py-1 text-xs font-bold text-white">
									PAST
								</span>
							{/if}
						</div>
					</div>

					<!-- Week navigation on the right -->
					<WeekSelector
						{weeks}
						{currentWeek}
						{week}
						onWeekChange={handleWeekChange}
						onNavigate={handleNavigate}
					/>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl">
		{@render children()}
	</div>
</div>
