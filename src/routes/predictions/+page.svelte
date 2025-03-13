<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Info, Check, AlertTriangle } from '@lucide/svelte';
	import type { Team, Prediction } from '$lib/server/db/schema';
	import type { Fixture as BaseFixture } from '$lib/server/db/schema';
	import type { SubmitFunction } from './$types';
	import PredictionCard from './components/PredictionCard.svelte';

	// Extended Fixture type with canPredict property
	type Fixture = BaseFixture & {
		canPredict?: boolean;
	};

	// Use the new $props runes syntax
	let { data, form } = $props<{
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
	let predictionValues = $state<Record<string, { home: number; away: number }>>({});

	// Effect to sync prediction values from API data
	$effect(() => {
		const newPredictionValues: Record<string, { home: number; away: number }> = {};

		// Initialize prediction values from existing predictions
		for (const fixtureId in predictions) {
			const prediction = predictions[fixtureId];
			newPredictionValues[fixtureId] = {
				home: prediction.predictedHomeScore,
				away: prediction.predictedAwayScore
			};
		}

		// Also initialize empty predictions for fixtures that can be predicted
		for (const fixture of fixtures) {
			if (canPredictFixture(fixture) && !newPredictionValues[fixture.id]) {
				newPredictionValues[fixture.id] = {
					home: 0,
					away: 0
				};
			}
		}

		predictionValues = newPredictionValues;
	});

	// Help function to determine if a prediction can be made
	function canPredictFixture(fixture: Fixture): boolean {
		// URGENT FIX: Allow all scheduled fixtures to be predicted regardless of date
		// The date parsing was causing issues with different locales/formats

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

			if (fixture && canPredictFixture(fixture)) {
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
	const handleSubmit: SubmitFunction = ({ cancel }) => {
		submitting = true;

		// Validate before submitting
		if (!validateForm()) {
			submitting = false;
			showError = true;
			errorMessage = 'Please fix the invalid predictions highlighted in red';
			setTimeout(() => {
				showError = false;
			}, 5000);
			cancel();
			return;
		}

		// Return processing function for after submission
		return async ({ result }) => {
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

	// Change week from dropdown
	function changeWeek(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newWeek = target.value;
		goto(`?week=${newWeek}`);
	}

	function isPredictionComplete(fixtureId: string): boolean {
		return (
			predictionValues[fixtureId]?.home !== undefined &&
			predictionValues[fixtureId]?.away !== undefined
		);
	}
</script>

<div class="container mx-auto max-w-6xl p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Week {week} Predictions</h1>
	</div>

	{#if week > currentWeek}
		<div class="mb-4 rounded-lg bg-blue-500/20 p-4 text-blue-100 shadow-lg">
			<div class="flex items-center gap-2">
				<Info class="size-5" />
				<span>
					You're viewing a future week. You can make predictions for any match with "upcoming"
					status. All upcoming matches should be available for prediction regardless of date.
				</span>
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

	<!-- Week navigation panel -->
	<div class="mb-8 rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<!-- Current week indicator -->
			<div>
				<span class="text-sm font-medium text-slate-300">Current League Week: {currentWeek}</span>
				{#if week !== currentWeek}
					<span class="ml-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-black">
						You're viewing week {week}
					</span>
				{:else}
					<span class="ml-2 rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-black">
						Current
					</span>
				{/if}
			</div>

			<!-- Week selector dropdown -->
			<div>
				<label for="week-selector" class="font-medium">Go to week:</label>
				<select
					id="week-selector"
					bind:value={week}
					on:change={changeWeek}
					class="ml-2 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1 text-slate-100 focus:border-blue-400 focus:outline-none"
				>
					{#each weeks as weekNum}
						<option value={weekNum}>{weekNum}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	{#if fixtures?.length === 0}
		<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-center shadow-lg">
			<p class="text-lg">No fixtures found for Week {week}.</p>
		</div>
	{:else}
		<form method="POST" action="?/savePredictions" use:enhance={handleSubmit}>
			<div class="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
				{#if fixtures?.filter((f) => canPredictFixture(f)).length === 0}
					<p class="text-center">
						{#if fixtures.length > 0}
							{#if week < currentWeek}
								Prediction window for Week {week} is closed.
							{:else if week === currentWeek}
								There are no matches available for prediction at this time. All matches may have
								already started or been completed.
							{:else}
								This is a future week. You can predict matches once the fixtures are upcoming.
							{/if}
						{/if}
					</p>
				{:else}
					<div class="flex items-center justify-between">
						<div>
							<p>
								<span class="font-medium"
									>{fixtures.filter((f) => canPredictFixture(f)).length}</span
								>
								match{fixtures.filter((f) => canPredictFixture(f)).length !== 1 ? 'es' : ''} available
								for prediction
							</p>
							<p>
								<span class="font-medium">
									{fixtures.filter((f) => canPredictFixture(f) && isPredictionComplete(f.id))
										.length}
								</span>
								prediction{fixtures.filter(
									(f) => canPredictFixture(f) && isPredictionComplete(f.id)
								).length !== 1
									? 's'
									: ''} set
							</p>
						</div>

						{#if fixtures.filter( (f) => canPredictFixture(f) ).length - fixtures.filter((f) => canPredictFixture(f) && isPredictionComplete(f.id)).length > 0}
							<div class="rounded-lg bg-yellow-500/20 p-2 text-sm text-yellow-100">
								<span class="font-medium">
									{fixtures.filter((f) => canPredictFixture(f)).length -
										fixtures.filter((f) => canPredictFixture(f) && isPredictionComplete(f.id))
											.length}
								</span>
								match{fixtures.filter((f) => canPredictFixture(f)).length -
									fixtures.filter((f) => canPredictFixture(f) && isPredictionComplete(f.id))
										.length !==
								1
									? 'es'
									: ''} still need predictions
							</div>
						{:else if fixtures.filter((f) => canPredictFixture(f)).length > 0}
							<div class="rounded-lg bg-green-500/20 p-2 text-sm text-green-100">
								All predictions complete! ✅
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="mb-6 flex justify-end">
				<button
					type="submit"
					class="rounded-xl border border-green-600 bg-green-700 px-6 py-2 font-medium text-white transition-all hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={submitting}
				>
					{submitting ? 'Saving...' : 'Save Predictions'}
				</button>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each fixtures as fixture}
					<PredictionCard
						{fixture}
						{teams}
						{predictions}
						bind:predictionValues
						{invalidPredictions}
					/>
				{/each}
			</div>

			<div class="mt-6 flex justify-end">
				<button
					type="submit"
					class="rounded-xl border border-green-600 bg-green-700 px-6 py-2 font-medium text-white transition-all hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={submitting}
				>
					{submitting ? 'Saving...' : 'Save Predictions'}
				</button>
			</div>
		</form>
	{/if}
</div>
