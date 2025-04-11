<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check, AlertTriangle } from '@lucide/svelte';
	import { page } from '$app/state';
	import type { Fixture as BaseFixture } from '$lib/server/db/schema';
	import PredictionCard from '../components/PredictionCard.svelte';
	import { browser } from '$app/environment';

	// Extended Fixture type with canPredict property
	type Fixture = BaseFixture & {
		canPredict?: boolean;
		isPastWeek?: boolean;
		isWeekend?: boolean;
		predictionClosesAt?: Date;
		isLive?: boolean;
	};

	// Use single-source-of-truth data from the page store
	let data = $derived(page.data);

	// Access data safely with fallbacks
	let fixtures = $derived(data?.fixtures || []);
	$inspect(fixtures);
	let teams = $derived(data?.teams || {});
	let week = $derived(data?.week || 1);
	let currentWeek = $derived(data?.currentWeek || 1);
	let predictions = $derived(data?.predictions || {});
	let isPastWeek = $derived(data?.isPastWeek || false);
	let lastUpdated = $derived(data?.lastUpdated || '');

	// Check if we have any live games
	let hasLiveFixtures = $derived(
		fixtures.some((f: Fixture) => f.status === 'IN_PLAY' || f.status === 'PAUSED')
	);

	// For form handling and UI
	let submitting = $state(false);
	let showSuccess = $state(false);
	let showError = $state(false);
	let errorMessage = $state('');
	let invalidPredictions = $state<string[]>([]);

	// Initialize prediction form data
	let predictionValues = $state<Record<string, { home: number; away: number } | null>>({});

	// Initialize predictions once
	$effect(() => {
		// Skip initialization if data is not yet available
		if (!data || !fixtures) return;

		// First time initialization
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

			// For past weeks, set null (no prediction)
			if (isPastWeek) {
				newPredictions[fixture.id] = null;
			}
			// For predictable fixtures in current/future weeks, initialize with zeros
			else if (fixture.canPredict) {
				newPredictions[fixture.id] = { home: 0, away: 0 };
			}
		}

		// Set all at once to reduce reactivity triggers
		predictionValues = newPredictions;
	});

	// Validate form before submission
	function validateForm(): boolean {
		const invalid: string[] = [];

		for (const fixtureId in predictionValues) {
			const prediction = predictionValues[fixtureId];
			if (!prediction) continue;

			const fixture = fixtures.find((f: Fixture) => f.id === fixtureId);
			if (!fixture?.canPredict) continue;

			const { home, away } = prediction;
			if (home < 0 || away < 0 || isNaN(home) || isNaN(away)) {
				invalid.push(fixtureId);
			}
		}

		invalidPredictions = invalid;
		return invalid.length === 0;
	}

	// Form submission handler
	const handleSubmit = () => {
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
	};

	// Update prediction handler
	function updatePrediction(fixtureId: string, home: number, away: number): void {
		predictionValues[fixtureId] = { home, away };
	}

	// Setup auto-refresh for live fixtures
	let refreshTimer: NodeJS.Timeout | number;

	// Effect to handle auto-refreshing for live fixtures
	$effect(() => {
		// Only run in the browser
		if (!browser) return;

		// Clear any existing timer
		if (refreshTimer) {
			clearTimeout(refreshTimer);
			refreshTimer = 0;
		}

		// Only set up auto-refresh if we're looking at the current week and have live games
		if (week === currentWeek && hasLiveFixtures) {
			// Refresh the page every 30 seconds to get updated fixture data
			refreshTimer = setTimeout(() => {
				window.location.reload();
			}, 30000);

			// Return cleanup function
			return () => {
				if (refreshTimer) {
					clearTimeout(refreshTimer);
				}
			};
		}
	});
</script>

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

{#if !fixtures?.length}
	<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-center shadow-lg">
		<p class="text-lg">No fixtures found for Week {week}.</p>
	</div>
{:else}
	<div class="w-full">
		{#if hasLiveFixtures}
			<div class="mb-4 rounded-lg border border-red-800 bg-red-900/30 p-4 text-center text-red-300">
				<p>
					<span class="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
					Live matches in progress - page will refresh automatically every 30 seconds
				</p>
			</div>
		{/if}

		<form method="POST" action="?/submitPredictions" use:enhance={handleSubmit} class="space-y-6">
			<input type="hidden" name="week" value={week} />

			<!-- Grid to display match predictions -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				{#each fixtures as fixture (fixture.id)}
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
