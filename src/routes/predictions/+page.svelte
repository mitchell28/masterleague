<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check, AlertTriangle } from '@lucide/svelte';
	import type { Team, Prediction } from '$lib/server/db/schema';
	import type { Fixture as BaseFixture } from '$lib/server/db/schema';
	import PredictionCard from './components/PredictionCard.svelte';

	// Extended Fixture type with canPredict property
	type Fixture = BaseFixture & {
		canPredict?: boolean;
	};

	// Use the new $props runes syntax
	let { data } = $props<{
		data: {
			fixtures: Fixture[];
			teams: Record<string, Team>;
			week: number;
			weeks: number[];
			currentWeek: number;
			predictions: Record<string, Prediction>;
		};
		form?: {
			success: boolean;
			message?: string;
		};
	}>();

	// Use the new $state and $derived runes syntax
	let fixtures = $derived(
		[...data.fixtures].sort(
			(a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
		)
	);
	let teams = $derived(data.teams);
	let week = $state(data.week);
	let weeks = $derived(data.weeks);
	let currentWeek = $state(data.currentWeek);
	let predictions = $derived(data.predictions);

	// For form handling and UI
	let submitting = $state(false);
	let showSuccess = $state(false);
	let showError = $state(false);
	let errorMessage = $state('');
	let invalidPredictions = $state<string[]>([]);

	// Initialize prediction form data
	let predictionValues = $state<Record<string, { home: number; away: number } | null>>({});

	// Effect to sync prediction values from API data - optimized to avoid infinite loops
	$effect(() => {
		// Create a new object instance each time (don't modify existing one)
		const newPredictionValues: Record<string, { home: number; away: number } | null> = {};

		// Initialize prediction values from existing predictions
		for (const fixtureId in predictions) {
			const prediction = predictions[fixtureId];
			newPredictionValues[fixtureId] = {
				home: prediction.predictedHomeScore,
				away: prediction.predictedAwayScore
			};
		}

		// For past weeks, explicitly set null (no prediction) for fixtures without predictions
		if (week < currentWeek) {
			for (const fixture of fixtures) {
				if (!newPredictionValues[fixture.id]) {
					// For past weeks, explicitly don't set any prediction
					newPredictionValues[fixture.id] = null;
				}
			}
		} else {
			// For current/future weeks, initialize empty predictions for fixtures that can be predicted
			for (const fixture of fixtures) {
				if (canPredictFixture(fixture) && !newPredictionValues[fixture.id]) {
					newPredictionValues[fixture.id] = {
						home: 0,
						away: 0
					};
				}
			}
		}

		// Set the entire object at once to reduce reactivity triggers
		predictionValues = newPredictionValues;
	});

	// Help function to determine if a prediction can be made
	function canPredictFixture(fixture: Fixture): boolean {
		// If we're viewing a past week, fixtures can't be predicted (read-only)
		if (week < currentWeek) {
			return false;
		}

		// For current or future weeks:
		// First check if it's a scheduled match - this should ALWAYS be predictable
		if (fixture.status === 'upcoming') {
			return true;
		}

		// Check server's calculation as fallback
		if (fixture.canPredict === true) {
			return true;
		}

		// If neither of the above conditions are met, it's not predictable
		return false;
	}

	// Validate form before submission
	function validateForm(): boolean {
		invalidPredictions = [];

		for (const fixtureId in predictionValues) {
			const prediction = predictionValues[fixtureId];
			const fixture = fixtures.find((f) => f.id === fixtureId);

			if (fixture && canPredictFixture(fixture) && prediction !== null) {
				if (
					prediction.home < 0 ||
					prediction.away < 0 ||
					isNaN(prediction.home) ||
					isNaN(prediction.away)
				) {
					invalidPredictions.push(fixtureId);
				}
			}
		}

		return invalidPredictions.length === 0;
	}
	// Form submission handler using SvelteKit 5 approach
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

	function isPredictionComplete(fixtureId: string): boolean {
		return (
			predictionValues[fixtureId] !== null &&
			predictionValues[fixtureId]?.home !== undefined &&
			predictionValues[fixtureId]?.away !== undefined
		);
	}
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

{#if fixtures?.length === 0}
	<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-center shadow-lg">
		<p class="text-lg">No fixtures found for Week {week}.</p>
	</div>
{:else}
	<div class="w-full">
		<form method="POST" action="?/submitPredictions" use:enhance={handleSubmit} class="space-y-6">
			<input type="hidden" name="week" value={week} />

			<!-- Grid to display match predictions -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				{#each fixtures as fixture (fixture.id)}
					<!-- Always show fixtures for past weeks regardless of status -->
					<!-- For current/future weeks, only show predictable fixtures -->
					{#if week < currentWeek || canPredictFixture(fixture)}
						<PredictionCard
							{fixture}
							homeTeam={teams[fixture.homeTeamId]}
							awayTeam={teams[fixture.awayTeamId]}
							prediction={predictionValues[fixture.id] ?? undefined}
							isInvalid={invalidPredictions.includes(fixture.id)}
							onUpdate={(home, away) => {
								predictionValues[fixture.id] = { home, away };
							}}
							readOnly={!canPredictFixture(fixture)}
							isPastWeek={week < currentWeek}
						/>

						<!-- Hidden input fields to ensure data is submitted (only for predictable fixtures) -->
						{#if canPredictFixture(fixture)}
							{#if predictionValues[fixture.id] !== null}
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
						{/if}
					{/if}
				{/each}
			</div>

			<!-- Submit button - only shown for current or future weeks -->
			{#if week >= currentWeek}
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
