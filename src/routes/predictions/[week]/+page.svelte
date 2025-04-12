<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { Check, AlertTriangle, RefreshCw } from '@lucide/svelte';
	import type { Team, Prediction } from '$lib/server/db/schema';
	import type { Fixture as BaseFixture } from '$lib/server/db/schema';
	import PredictionCard from '../components/PredictionCard.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';

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

	// Get week from page params
	let week = $derived(page.params.week);
	let isCurrentWeek = $derived(data.currentWeek === parseInt(week));

	// Access data safely with fallbacks
	let fixtures = $derived(data?.fixtures || []);
	let teams = $derived(data?.teams || {});
	let predictions = $derived(data?.predictions || {});
	let isPastWeek = $derived(data?.isPastWeek || false);

	// Form handling and UI state using $state
	let submitting: boolean = $state(false);
	let showSuccess: boolean = $state(false);
	let showError: boolean = $state(false);
	let errorMessage: string = $state('');
	let invalidPredictions: string[] = $state([]);

	// Live fixture polling state using $state
	let isPolling: boolean = $state(false);
	let pollingTimer: ReturnType<typeof setTimeout> | null = $state(null);
	let lastPollTime: Date = $state(new Date());
	let hasLiveFixtures: boolean = $state(false);
	let isUpdating: boolean = $state(false);
	let updateFailed: boolean = $state(false);

	// State for local fixture updates - initialize once during mount
	let localFixtures: Fixture[] = $state([]);

	// Initialize prediction form data
	let predictionValues: Record<string, { home: number; away: number } | null> = $state({});

	// Initialize everything on mount to avoid update loops
	onMount(() => {
		// Initialize local fixtures (do this just once to avoid loops)
		localFixtures = [...fixtures];

		// Check for live fixtures
		hasLiveFixtures = fixtures.some((f: Fixture) => f.isLive);

		// Initialize prediction values
		initializePredictions();

		// Start polling if needed
		if (hasLiveFixtures && isCurrentWeek) {
			startPolling();
		}
	});

	// Watch for form data changes (fixture updates)
	$effect(() => {
		if (form?.fixtures && form.fixtures.length > 0) {
			// Update local fixtures with form data
			localFixtures = [...form.fixtures];

			// Check if we still have live fixtures
			const stillHasLiveFixtures = form.fixtures.some((f: Fixture) =>
				['IN_PLAY', 'PAUSED'].includes(f.status)
			);

			// Only update if changed to prevent loops
			if (hasLiveFixtures !== stillHasLiveFixtures) {
				hasLiveFixtures = stillHasLiveFixtures;
			}

			// Update last poll time
			lastPollTime = new Date();
		}
	});

	// Initialize predictions function
	function initializePredictions() {
		const newPredictions: Record<string, { home: number; away: number } | null> = {};

		// Initialize values from existing predictions
		for (const fixtureId in predictions) {
			const prediction = predictions[fixtureId];
			newPredictions[fixtureId] = {
				home: prediction.home,
				away: prediction.away
			};
		}

		// Initialize new predictions for fixtures that can be predicted
		for (const fixture of fixtures) {
			// Skip if we already have a prediction
			if (newPredictions[fixture.id]) continue;

			// For past weeks or fixtures that can't be predicted, set null (no prediction)
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

	// Watch data changes carefully - we need to re-init only when necessary
	$effect(() => {
		if (data?.fixtures) {
			// If we weren't polling and didn't have local data, initialize
			if (localFixtures.length === 0) {
				localFixtures = [...data.fixtures];
				hasLiveFixtures = localFixtures.some((f) => f.isLive);

				// Initialize predictions
				initializePredictions();

				// Start polling if needed
				if (hasLiveFixtures && isCurrentWeek && !isPolling) {
					startPolling();
				}
			}
		}
	});

	// Validate form before submission
	function validateForm(): boolean {
		const invalid: string[] = [];

		for (const fixtureId in predictionValues) {
			const prediction = predictionValues[fixtureId];
			if (!prediction) continue;

			const fixture = localFixtures.find((f: { id: string }) => f.id === fixtureId);
			if (!fixture?.canPredict) continue;

			const { home, away } = prediction;
			if (home < 0 || away < 0 || isNaN(home) || isNaN(away)) {
				invalid.push(fixtureId);
			}
		}

		invalidPredictions = invalid;
		return invalid.length === 0;
	}

	// Form submission handler using enhance
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

	// Update prediction handler
	function updatePrediction(fixtureId: string, home: number, away: number): void {
		predictionValues[fixtureId] = { home, away };
	}

	// Polling function for live fixture updates using form action
	async function pollFixtureUpdates() {
		if (isUpdating || !hasLiveFixtures || !isCurrentWeek) return;

		isUpdating = true;
		updateFailed = false;

		try {
			// Create form data with fixture IDs
			const formData = new FormData();

			// Include IDs of current fixtures
			const fixtureIds = localFixtures.map((f) => f.id);
			formData.append('fixtureIds', JSON.stringify(fixtureIds));

			// Call the form action and invalidate the data
			const response = await fetch(`?/updateFixtures`, {
				method: 'POST',
				body: formData
			});

			// Invalidate the page data to get latest from server
			invalidate(`/predictions/${week}`);

			if (!response.ok) {
				throw new Error(`Failed to update fixtures: ${response.status}`);
			}

			// Response will be processed automatically by SvelteKit
			// and available in the form prop
		} catch (error) {
			console.error('Error polling for fixture updates:', error);
			updateFailed = true;
		} finally {
			isUpdating = false;
		}
	}

	// Start polling for updates - single method to manage state
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

	// Watch for changes to hasLiveFixtures and isCurrentWeek to manage polling
	$effect(() => {
		if (hasLiveFixtures && isCurrentWeek && !isPolling) {
			startPolling();
		} else if ((!hasLiveFixtures || !isCurrentWeek) && isPolling) {
			stopPolling();
		}
	});

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

<!-- Live matches indicator - only show for current week with live matches -->
{#if hasLiveFixtures && isCurrentWeek}
	<div class="mb-4 rounded-lg bg-gradient-to-r from-blue-900/50 to-blue-700/30 p-3 shadow">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="relative flex h-3 w-3">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"
					></span>
					<span class="relative inline-flex h-3 w-3 rounded-full bg-red-600"></span>
				</span>
				<span class="font-semibold text-blue-200">Live Matches</span>
				<span class="text-xs text-blue-300">
					Auto-updating {#if isPolling}(last update: {new Date(lastPollTime).toLocaleTimeString()})
					{/if}
				</span>
			</div>
			<button
				onclick={manualRefresh}
				class="flex items-center gap-1 rounded-md bg-blue-800/50 px-2 py-1 text-xs text-blue-200 hover:bg-blue-800"
				disabled={isUpdating}
				title="Refresh scores now"
			>
				<RefreshCw size={14} class={isUpdating ? 'animate-spin' : ''} />
				<span>Refresh</span>
			</button>
		</div>
	</div>
{/if}

{#if showSuccess}
	<div class="mb-4 animate-pulse rounded-lg bg-green-500/20 p-4 text-green-100 shadow-lg">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Check class="size-5" />
				<span class="font-medium">Predictions saved successfully!</span>
			</div>
		</div>
	</div>
{/if}

{#if showError}
	<div class="mb-4 animate-pulse rounded-lg bg-red-500/20 p-4 text-red-100 shadow-lg">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<AlertTriangle class="size-5" />
				<span class="font-medium">{errorMessage}</span>
			</div>
		</div>
	</div>
{/if}

{#if updateFailed}
	<div class="mb-4 rounded-lg bg-yellow-500/20 p-3 text-yellow-100 shadow">
		<div class="flex items-center gap-2">
			<AlertTriangle class="size-4" />
			<span class="text-sm"
				>Unable to get the latest scores. <button class="underline" onclick={manualRefresh}
					>Try again</button
				></span
			>
		</div>
	</div>
{/if}

<!-- Show API rate limit warning if needed -->
{#if form?.rateLimited}
	<div class="mb-4 rounded-lg bg-amber-600/20 p-3 text-amber-100 shadow">
		<div class="flex items-center gap-2">
			<AlertTriangle class="size-4" />
			<span class="text-sm">Football API rate limit reached. Using cached data.</span>
		</div>
	</div>
{/if}

{#if !localFixtures?.length}
	<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-center shadow-lg">
		<p class="text-lg">No fixtures found for Week {week}.</p>
	</div>
{:else}
	<!-- Main predictions form -->
	<div class="w-full">
		<form method="POST" action="?/submitPredictions" use:enhance={handleSubmit} class="space-y-6">
			<input type="hidden" name="week" value={week} />

			<!-- Grid to display match predictions -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				{#each localFixtures as fixture (fixture.id)}
					<PredictionCard
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
				<div class="flex justify-end">
					<button
						type="submit"
						class="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						disabled={submitting}
					>
						{submitting ? 'Saving...' : 'Save Predictions'}
					</button>
				</div>
			{:else}
				<div class="mt-4 text-center text-sm text-slate-400 italic">
					Viewing past predictions - no changes allowed
				</div>
			{/if}
		</form>
	</div>
{/if}

<!-- Hidden form for fixture updates -->
<form method="POST" action="?/updateFixtures" hidden></form>
