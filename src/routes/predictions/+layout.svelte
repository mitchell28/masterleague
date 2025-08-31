<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Info } from '@lucide/svelte';
	import WeekSelector from '$lib/components/WeekSelector.svelte';

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
	<!-- Main Header with clean geometric design and mobile responsive layout -->
	<div class="relative mb-4 sm:mb-6">
		<div class="font-display w-full overflow-hidden bg-slate-900">
			<!-- Current League Week Status Bar -->
			<div class="bg-accent/10 border-accent/20 border-b px-4 py-2 sm:px-6">
				<div class="mx-auto flex max-w-6xl items-center justify-center gap-2 text-center">
					<span class="text-xs font-medium text-slate-300 sm:text-sm"> Current League Week: </span>
					<span class="bg-accent px-2 py-1 text-xs font-bold text-black sm:px-3">
						Week {currentWeek}
					</span>
				</div>
			</div>

			<!-- Main Header Content -->
			<div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
				<!-- Mobile Layout: Stack vertically -->
				<div class="flex flex-col gap-4 sm:hidden">
					<div class="text-center">
						<h1 class="text-2xl font-bold text-white">Week {week}</h1>
						<div class="mt-2 flex items-center justify-center gap-2">
							{#if weekStatus === 'current'}
								<span class="bg-accent px-2 py-1 text-xs font-bold text-black"> CURRENT WEEK </span>
							{:else if weekStatus === 'future'}
								<span class=" bg-blue-500 px-2 py-1 text-xs font-bold text-white">
									FUTURE WEEK
								</span>
							{:else if weekStatus === 'past'}
								<span class=" bg-gray-500 px-2 py-1 text-xs font-bold text-white"> PAST WEEK </span>
							{/if}
						</div>
						<div class="mt-2 text-center">
							<span class="text-xs text-slate-400">Predictions close 30 mins before kickoff</span>
						</div>
					</div>

					<!-- Week navigation centered on mobile -->
					<div class="flex justify-center">
						<WeekSelector
							{weeks}
							{currentWeek}
							{week}
							onWeekChange={handleWeekChange}
							onNavigate={handleNavigate}
						/>
					</div>
				</div>

				<!-- Desktop Layout: Side by side -->
				<div class="hidden sm:flex sm:items-center sm:justify-between">
					<div>
						<h1 class="text-3xl font-bold text-white lg:text-4xl">Week {week}</h1>
						<div class="mt-2 flex items-center gap-3">
							{#if weekStatus === 'current'}
								<span class="bg-accent px-3 py-1 text-xs font-bold text-black"> CURRENT WEEK </span>
							{:else if weekStatus === 'future'}
								<span class=" bg-blue-500 px-3 py-1 text-xs font-bold text-white">
									FUTURE WEEK
								</span>
							{:else if weekStatus === 'past'}
								<span class=" bg-gray-500 px-3 py-1 text-xs font-bold text-white"> PAST WEEK </span>
							{/if}
							<span class="text-xs text-slate-400"> Predictions close 30 mins before kickoff </span>
						</div>
					</div>

					<!-- Week navigation on the right for desktop -->
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

	<!-- Main Content Area with responsive padding -->
	<div class="mx-auto max-w-6xl px-4">
		<!-- Future Week Message -->
		{#if showFutureWeekMessage}
			<div class="mt-6 mb-6">
				<div class="font-display w-full border-l-4 border-l-blue-500 bg-slate-900 p-4 sm:p-6">
					<div class="flex items-start gap-3">
						<div>
							<div class="mb-2 flex items-center gap-2">
								<span
									class=" bg-blue-500 px-2 py-1 text-xs font-bold text-white sm:px-3 sm:text-sm"
								>
									FUTURE WEEK
								</span>
							</div>
							<div class=" text-sm text-blue-200 sm:text-base">
								<p class="font-medium text-white">You're viewing a future week</p>
								<p class="mt-1 font-sans text-blue-300">
									Predictions may not be available yet. Current week is {currentWeek}.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		{@render children()}
	</div>
</div>
