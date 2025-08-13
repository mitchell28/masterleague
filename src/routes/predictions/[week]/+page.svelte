<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { Check, AlertTriangle, RefreshCw } from '@lucide/svelte';
	import type { Team, Prediction } from '$lib/server/db/schema';
	import type { Fixture as BaseFixture } from '$lib/server/db/schema';
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';
	import PredictionCardV2 from '../components/PredictionCardV2.svelte';

	// Extended Fixture type with canPredict property
	type Fixture = BaseFixture & {
		canPredict?: boolean;
		isPastWeek?: boolean;
		isLive?: boolean;
	};

	// Type for our page data to ensure it matches server return type
	interface PredictionsPageData {
		fixtures: Fixture[];
		teams: Record<string, Team>;
		predictions: Record<string, Prediction & { home: number; away: number }>;
		isPastWeek: boolean;
		lastUpdated: string;
		currentWeek: number;
		week: number;
	}

	// Using runes for page data
	let { data, form } = $props<{
		data: PredictionsPageData;
		form?: {
			success: boolean;
			message?: string;
			fixtures?: Fixture[];
			updated?: number;
			live?: number;
			rateLimited?: boolean;
		};
	}>();

	// Get week from page params and data
	let weekParam = $derived(parseInt(page.params.week) || 1);
	let isCurrentWeek = $derived(data.currentWeek === weekParam);

	// Form handling and UI state using $state with memoization
	let submitting = $state(false);
	let showSuccess = $state(false);
	let showError = $state(false);
	let errorMessage = $state('');
	let invalidPredictions = $state<string[]>([]);

	// Live fixture polling state
	let isPolling = $state(false);
	let pollingTimer: ReturnType<typeof setTimeout> | null = $state(null);
	let lastPollTime = $state(new Date());
	let isUpdating = $state(false);
	let updateFailed = $state(false);

	// Local state for fixtures and predictions
	let localFixtures = $state<Fixture[]>([]);
	let predictionValues = $state<Record<string, { home: number; away: number } | null>>({});

	// Track the current displayed week
	let currentDisplayedWeek = $state(0);

	// Memoize derived values to prevent recalculation
	let hasLiveFixtures = $derived(localFixtures.some((f) => f.isLive));
	let isPastWeek = $derived(data?.isPastWeek || false);
	let teams = $derived(data?.teams || {});
	let predictions = $derived(data?.predictions || {});

	// Initialize fixtures and predictions when component mounts or data changes
	$effect(() => {
		// This effect runs when the component mounts or when data.week changes
		if (data && data.week !== currentDisplayedWeek) {
			updateComponentData();
		}
	});

	// Handle form fixture updates separately
	$effect(() => {
		if (form?.fixtures && form.fixtures.length > 0) {
			// Replace fixtures with form data
			localFixtures = [...form.fixtures];

			// Update last poll time
			lastPollTime = new Date();
		}
	});

	// Function to update component data when week changes
	function updateComponentData() {
		// Update fixtures from data
		if (data?.fixtures) {
			localFixtures = [...data.fixtures];
			currentDisplayedWeek = data.week;

			// Update predictions
			initializePredictions();

			// Update polling state
			updatePollingState();
		}
	}

	// Optimized prediction initialization - only runs when needed
	function initializePredictions() {
		// Skip if no fixtures
		if (!localFixtures.length) return;

		const newPredictions: Record<string, { home: number; away: number } | null> = {};

		// Initialize values from existing predictions
		for (const fixtureId in predictions) {
			const prediction = predictions[fixtureId];
			if (prediction) {
				newPredictions[fixtureId] = {
					home: prediction.home,
					away: prediction.away
				};
			}
		}

		// Initialize new predictions only for fixtures that can be predicted
		for (const fixture of localFixtures) {
			// Skip if we already have a prediction
			if (newPredictions[fixture.id]) continue;

			// For past weeks or fixtures that can't be predicted, set null
			if (isPastWeek || !fixture.canPredict) {
				newPredictions[fixture.id] = null;
			}
			// For predictable fixtures in current/future weeks, initialize with zeros
			else if (fixture.canPredict) {
				newPredictions[fixture.id] = { home: 0, away: 0 };
			}
		}

		// Set all at once to minimize reactivity triggers
		predictionValues = newPredictions;
	}

	// Update polling based on current state
	function updatePollingState() {
		if (hasLiveFixtures && isCurrentWeek && !isPolling) {
			// Use setTimeout to delay start to reduce initial load impact
			setTimeout(startPolling, 1000);
		} else if ((!hasLiveFixtures || !isCurrentWeek) && isPolling) {
			stopPolling();
		}
	}

	// Validate form before submission - optimized
	function validateForm(): boolean {
		const invalid: string[] = [];
		const predictableFixtures = localFixtures.filter((f) => f.canPredict);

		// Only validate fixtures that can be predicted
		for (const fixture of predictableFixtures) {
			const prediction = predictionValues[fixture.id];
			if (!prediction) continue;

			const { home, away } = prediction;
			if (home < 0 || away < 0 || isNaN(home) || isNaN(away)) {
				invalid.push(fixture.id);
			}
		}

		invalidPredictions = invalid;
		return invalid.length === 0;
	}

	// Form submission handler
	function handleSubmit() {
		submitting = true;

		// Validate before submitting
		if (!validateForm()) {
			submitting = false;
			showError = true;
			errorMessage = 'Please fix the invalid predictions highlighted in red';
			setTimeout(() => {
				showError = false;
			}, 5000);
			return;
		}

		// Return processing function for after submission
		return async ({ result }: { result: { type: string; data?: { message: string } } }) => {
			submitting = false;

			if (result.type === 'success') {
				showSuccess = true;
				setTimeout(() => {
					showSuccess = false;
				}, 3000);
			} else if (result.type === 'failure') {
				showError = true;
				errorMessage = result.data?.message || 'Failed to save predictions';
				setTimeout(() => {
					showError = false;
				}, 5000);
			}
		};
	}

	// Optimized prediction update handler with less reactivity
	function updatePrediction(fixtureId: string, home: number, away: number): void {
		// Direct object property update to minimize renders
		if (predictionValues[fixtureId]) {
			predictionValues[fixtureId] = { home, away };
		}
	}

	// Optimize polling with better debounce and rate limiting
	let lastPollRequest = 0;
	const POLL_MINIMUM_INTERVAL = 5000; // 5 seconds minimum between polls

	// Optimized polling function
	async function pollFixtureUpdates() {
		// Skip if already updating or no live fixtures
		if (isUpdating || !hasLiveFixtures || !isCurrentWeek) return;

		// Rate limit polling
		const now = Date.now();
		if (now - lastPollRequest < POLL_MINIMUM_INTERVAL) {
			return;
		}
		lastPollRequest = now;

		isUpdating = true;
		updateFailed = false;

		try {
			// Create form data with fixture IDs - only include live fixtures
			const formData = new FormData();
			const liveFixtureIds = localFixtures.filter((f) => f.isLive).map((f) => f.id);

			formData.append('fixtureIds', JSON.stringify(liveFixtureIds));

			// Call the form action and invalidate the data
			const response = await fetch(`?/updateFixtures`, {
				method: 'POST',
				body: formData
			});

			// Invalidate the page data to get latest from server
			invalidate(`fixtures:${weekParam}`);

			if (!response.ok) {
				throw new Error(`Failed to update fixtures: ${response.status}`);
			}
		} catch (error) {
			console.error('Error polling for fixture updates:', error);
			updateFailed = true;
		} finally {
			isUpdating = false;
		}
	}

	// Start polling for updates - better implementation
	function startPolling() {
		if (isPolling) return;

		isPolling = true;
		// Poll immediately, then every 30 seconds
		pollFixtureUpdates();
		pollingTimer = setInterval(() => {
			pollFixtureUpdates();
		}, 30000); // 30 seconds
	}

	// Stop polling for updates
	function stopPolling() {
		if (!isPolling) return;

		isPolling = false;
		if (pollingTimer) {
			clearInterval(pollingTimer);
			pollingTimer = null;
		}
	}

	// Force refresh the fixture data
	function manualRefresh() {
		if (isUpdating) return;
		pollFixtureUpdates();
	}

	// Clean up polling on component destroy
	onDestroy(() => {
		stopPolling();
	});
</script>

<!-- Live matches indicator with clean design -->
{#if hasLiveFixtures && isCurrentWeek}
	<div class="relative mb-6">
		<div
			class="relative h-[90px] w-full overflow-hidden border-b-4 border-red-500 bg-gradient-to-r from-red-900/50 to-red-700/30"
		>
			<!-- Red top bar -->
			<div class="flex h-[18px] w-full items-center justify-center bg-red-500">
				<span class="text-xs font-bold text-white">LIVE MATCHES</span>
			</div>

			<!-- Content -->
			<div class="relative flex h-full items-center justify-between px-6 pt-3 pb-4">
				<div class="flex items-center gap-3">
					<span class="relative flex h-4 w-4">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"
						></span>
						<span class="relative inline-flex h-4 w-4 rounded-full bg-red-600"></span>
					</span>
					<div class="flex flex-col">
						<span class="font-semibold text-red-100">Auto-updating scores</span>
						{#if isPolling}
							<span class="text-xs text-red-200">
								Last update: {new Date(lastPollTime).toLocaleTimeString()}
							</span>
						{/if}
					</div>
				</div>
				<button
					onclick={manualRefresh}
					class="flex items-center gap-2 rounded bg-red-800/50 px-3 py-2 text-xs text-red-100 hover:bg-red-800"
					disabled={isUpdating}
					title="Refresh scores now"
				>
					<RefreshCw size={14} class={isUpdating ? 'animate-spin' : ''} />
					<span>Refresh</span>
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showSuccess}
	<div class="relative mb-6">
		<div
			class="relative h-[80px] w-full overflow-hidden border-b-4 border-green-500 bg-green-500/20"
		>
			<!-- Success top bar -->
			<div class="flex h-[16px] w-full items-center justify-center bg-green-500">
				<span class="text-xs font-bold text-black">SUCCESS</span>
			</div>

			<!-- Content -->
			<div class="relative flex h-full items-center gap-3 px-6 pt-3 pb-4">
				<Check size={20} class="text-green-200" />
				<span class="font-medium text-green-100">Predictions saved successfully!</span>
			</div>
		</div>
	</div>
{/if}

{#if showError}
	<div class="relative mb-6">
		<div class="relative h-[80px] w-full overflow-hidden border-b-4 border-red-500 bg-red-500/20">
			<!-- Error top bar -->
			<div class="flex h-[16px] w-full items-center justify-center bg-red-500">
				<span class="text-xs font-bold text-white">ERROR</span>
			</div>

			<!-- Content -->
			<div class="relative flex h-full items-center gap-3 px-6 pt-3 pb-4">
				<AlertTriangle size={20} class="text-red-200" />
				<span class="font-medium text-red-100">{errorMessage}</span>
			</div>
		</div>
	</div>
{/if}

{#if updateFailed}
	<div class="relative mb-6">
		<div
			class="relative h-[80px] w-full overflow-hidden border-b-4 border-yellow-500 bg-yellow-500/20"
		>
			<!-- Warning top bar -->
			<div class="flex h-[16px] w-full items-center justify-center bg-yellow-500">
				<span class="text-xs font-bold text-black">WARNING</span>
			</div>

			<!-- Content -->
			<div class="relative flex h-full items-center gap-3 px-6 pt-3 pb-4">
				<AlertTriangle size={16} class="text-yellow-200" />
				<span class="text-sm text-yellow-100">
					Unable to get the latest scores.
					<button class="underline hover:no-underline" onclick={manualRefresh}>Try again</button>
				</span>
			</div>
		</div>
	</div>
{/if}

<!-- Show API rate limit warning if needed -->
{#if form?.rateLimited}
	<div class="relative mb-6">
		<div
			class="relative h-[80px] w-full overflow-hidden border-b-4 border-amber-500 bg-amber-600/20"
		>
			<!-- Rate limit top bar -->
			<div class="flex h-[16px] w-full items-center justify-center bg-amber-500">
				<span class="text-xs font-bold text-black">RATE LIMITED</span>
			</div>

			<!-- Content -->
			<div class="relative flex h-full items-center gap-3 px-6 pt-3 pb-4">
				<AlertTriangle size={16} class="text-amber-200" />
				<span class="text-sm text-amber-100"
					>Football API rate limit reached. Using cached data.</span
				>
			</div>
		</div>
	</div>
{/if}

{#if !localFixtures?.length}
	<div class="relative mb-6">
		<div
			class="relative h-[120px] w-full overflow-hidden border-b-6 border-slate-500 bg-slate-800/50"
		>
			<!-- No fixtures top bar -->
			<div class="flex h-[20px] w-full items-center justify-center bg-slate-500">
				<span class="font-bold text-black">NO FIXTURES</span>
			</div>

			<!-- Content -->
			<div class="relative flex h-full items-center justify-center px-6 pt-4 pb-4">
				<p class="text-center text-lg text-white">No fixtures found for Week {weekParam}.</p>
			</div>
		</div>
	</div>
{:else}
	<!-- Main predictions form -->
	<div class="w-full">
		<form method="POST" action="?/submitPredictions" use:enhance={handleSubmit} class="space-y-6">
			<input type="hidden" name="week" value={weekParam} />

			<!-- Grid to display match predictions - with optimized keyed each -->
			<div class="grid grid-cols-1 items-center justify-center gap-10 px-6 md:grid-cols-2">
				{#each localFixtures as fixture (fixture.id)}
					<PredictionCardV2
						{fixture}
						homeTeam={teams[fixture.homeTeamId]}
						awayTeam={teams[fixture.awayTeamId]}
						prediction={predictionValues[fixture.id] ?? undefined}
						isInvalid={invalidPredictions.includes(fixture.id)}
						onUpdate={(home, away) => updatePrediction(fixture.id, home, away)}
						readOnly={!fixture.canPredict}
						{isPastWeek}
					/>

					<!-- Hidden input fields to ensure data is submitted (only for predictable fixtures) -->
					{#if fixture.canPredict && predictionValues[fixture.id] !== null}
						<input
							type="hidden"
							name="prediction-{fixture.id}-home"
							value={predictionValues[fixture.id]?.home || 0}
						/>
						<input
							type="hidden"
							name="prediction-{fixture.id}-away"
							value={predictionValues[fixture.id]?.away || 0}
						/>
					{/if}
				{/each}
			</div>

			<!-- Submit button - only shown for current or future weeks -->
			{#if !isPastWeek}
				<div class="mt-8 flex justify-end">
					<button
						type="submit"
						class="bg-accent hover:bg-accent/80 font-display rounded px-8 py-3 font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
						disabled={submitting}
					>
						{submitting ? 'SAVING...' : 'SAVE PREDICTIONS'}
					</button>
				</div>
			{:else}
				<div class="relative mt-8">
					<div
						class="relative h-[60px] w-full overflow-hidden border-b-2 border-slate-400 bg-slate-800/30"
					>
						<!-- Past week top bar -->
						<div class="flex h-[12px] w-full items-center justify-center bg-slate-400">
							<span class="text-xs font-bold text-black">PAST WEEK</span>
						</div>

						<!-- Content -->
						<div class="relative flex h-full items-center justify-center px-6 pt-2 pb-4">
							<span class="text-sm text-slate-400 italic">
								Viewing past predictions - no changes allowed
							</span>
						</div>
					</div>
				</div>
			{/if}
		</form>
	</div>
{/if}
