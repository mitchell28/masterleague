<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Info, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import WeekSelector from '$lib/components/WeekSelector.svelte';
	import { swipeAction } from '$lib/hooks';

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

	// Swipe navigation state
	let swipeDelta = $state(0);
	let isSwipeNavigating = $state(false);

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

	// Reference to content container for view transitions
	let contentContainer: HTMLElement;

	// Track swipe direction for CSS view transition
	let swipeDirection = $state<'left' | 'right' | null>(null);

	// Navigate with View Transitions API
	async function navigateWithTransition(targetWeek: number, direction: 'left' | 'right') {
		swipeDirection = direction;
		
		// Check if View Transitions API is supported
		if (document.startViewTransition) {
			const transition = document.startViewTransition(async () => {
				await goto(`/predictions/${targetWeek}`);
			});
			await transition.finished;
		} else {
			// Fallback for unsupported browsers
			await goto(`/predictions/${targetWeek}`);
		}
		
		swipeDirection = null;
	}

	// Swipe handlers for mobile week navigation
	async function handleSwipeLeft() {
		// Swipe left = go to next week
		if (weeks?.includes(week + 1)) {
			isSwipeNavigating = true;
			await navigateWithTransition(week + 1, 'left');
			isSwipeNavigating = false;
		}
	}

	async function handleSwipeRight() {
		// Swipe right = go to previous week
		if (weeks?.includes(week - 1)) {
			isSwipeNavigating = true;
			await navigateWithTransition(week - 1, 'right');
			isSwipeNavigating = false;
		}
	}

	function handleSwipeMove(deltaX: number) {
		// Only show indicator if there's a valid target week
		const canGoLeft = weeks?.includes(week + 1);
		const canGoRight = weeks?.includes(week - 1);

		if ((deltaX < 0 && canGoLeft) || (deltaX > 0 && canGoRight)) {
			swipeDelta = deltaX;
		} else {
			swipeDelta = deltaX * 0.2; // Resistance when can't navigate
		}
	}

	function handleSwipeEnd() {
		swipeDelta = 0;
	}

	// Check if navigation is possible
	let canNavigatePrev = $derived(weeks?.includes(week - 1) ?? false);
	let canNavigateNext = $derived(weeks?.includes(week + 1) ?? false);
</script>

<!-- Swipe container for mobile week navigation -->
<div
	class="mx-auto mt-22 touch-pan-y"
	use:swipeAction={{
		onSwipeLeft: handleSwipeLeft,
		onSwipeRight: handleSwipeRight,
		onSwipeMove: handleSwipeMove,
		onSwipeEnd: handleSwipeEnd,
		threshold: 80,
		enabled: true
	}}
>
	<!-- Swipe Indicators (mobile only) -->
	<div class="pointer-events-none fixed top-1/2 right-0 left-0 z-50 -translate-y-1/2 md:hidden">
		<!-- Left indicator (previous week) -->
		{#if swipeDelta > 30 && canNavigatePrev}
			<div
				class="bg-accent/90 absolute left-2 flex items-center gap-2 px-4 py-2 text-sm font-medium text-black shadow-lg transition-all duration-150"
				style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%); opacity: {Math.min(1, (swipeDelta - 30) / 50)}; transform: translateX({Math.min(20, (swipeDelta - 30) / 3)}px)"
			>
				<ChevronLeft class="size-4" />
				Week {week - 1}
			</div>
		{/if}
		<!-- Right indicator (next week) -->
		{#if swipeDelta < -30 && canNavigateNext}
			<div
				class="bg-accent/90 absolute right-2 flex items-center gap-2 px-4 py-2 text-sm font-medium text-black shadow-lg transition-all duration-150"
				style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%); opacity: {Math.min(1, (Math.abs(swipeDelta) - 30) / 50)}; transform: translateX({Math.max(-20, (swipeDelta + 30) / 3)}px)"
			>
				Week {week + 1}
				<ChevronRight class="size-4" />
			</div>
		{/if}
	</div>

	<!-- Mobile swipe hint (shown on first visit) -->
	<div class="border-accent/20 flex items-center justify-center gap-2 border-b bg-slate-900/50 px-4 py-2 text-xs text-slate-400 sm:hidden">
		<ChevronLeft class="size-3" />
		<span>Swipe to navigate weeks</span>
		<ChevronRight class="size-3" />
	</div>

	<!-- Main Header with clean geometric design and mobile responsive layout -->
	<div class="relative mb-4 sm:mb-6">
		<div class="font-display w-full overflow-hidden bg-slate-900">
			<!-- Main Header Content -->
			<div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
				<!-- Mobile Layout: Stack vertically -->
				<div class="flex flex-col gap-4 sm:hidden">
					<div class="text-center">
						<h1 class="text-2xl font-bold text-white">Week {week}</h1>
						<div class="mt-2 flex flex-wrap items-center justify-center gap-2">
							{#if weekStatus === 'current'}
								<span class="bg-accent px-2 py-1 text-xs font-bold text-black"> CURRENT WEEK </span>
							{:else if weekStatus === 'future'}
								<span class=" bg-blue-500 px-2 py-1 text-xs font-bold text-white">
									FUTURE WEEK
								</span>
							{:else if weekStatus === 'past'}
								<span class=" bg-gray-500 px-2 py-1 text-xs font-bold text-white"> PAST WEEK </span>
							{/if}
							{#if weekStatus !== 'current'}
								<span class="text-xs text-slate-400">(Current: Week {currentWeek})</span>
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
							{#if weekStatus !== 'current'}
								<span class="text-xs text-slate-400">(Current: Week {currentWeek})</span>
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
	<div
		bind:this={contentContainer}
		class="mx-auto max-w-6xl px-4"
		class:slide-left={swipeDirection === 'left'}
		class:slide-right={swipeDirection === 'right'}
	>
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

<style>
	/* View Transitions CSS - slide animations */
	@keyframes slide-out-left {
		from { transform: translateX(0); opacity: 1; }
		to { transform: translateX(-100px); opacity: 0; }
	}
	
	@keyframes slide-in-left {
		from { transform: translateX(100px); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}
	
	@keyframes slide-out-right {
		from { transform: translateX(0); opacity: 1; }
		to { transform: translateX(100px); opacity: 0; }
	}
	
	@keyframes slide-in-right {
		from { transform: translateX(-100px); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}
	
	/* Apply animations to view transition pseudo-elements */
	:global(::view-transition-old(predictions-content)) {
		animation: slide-out-left 150ms ease-in forwards;
	}
	
	:global(::view-transition-new(predictions-content)) {
		animation: slide-in-left 150ms ease-out forwards;
	}
	
	/* Reverse direction for right swipe */
	:global(.slide-right ~ ::view-transition-old(predictions-content)),
	:global(html:has(.slide-right) ::view-transition-old(predictions-content)) {
		animation: slide-out-right 150ms ease-in forwards;
	}
	
	:global(.slide-right ~ ::view-transition-new(predictions-content)),
	:global(html:has(.slide-right) ::view-transition-new(predictions-content)) {
		animation: slide-in-right 150ms ease-out forwards;
	}
</style>
