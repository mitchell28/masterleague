<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Info, Check, AlertTriangle } from '@lucide/svelte';
	import type { Team, Prediction } from '$lib/server/db/schema';
	import type { Fixture as BaseFixture } from '$lib/server/db/schema';
	import type { SubmitFunction } from './$types';

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
	type PredictionValue = {
		home: number;
		away: number;
	};
	let predictionValues = $state<Record<string, PredictionValue>>({});

	// Set up initial prediction values from data
	$effect(() => {
		const newValues: Record<string, PredictionValue> = {};
		fixtures.forEach((fixture) => {
			const prediction = predictions[fixture.id];
			newValues[fixture.id] = {
				home: prediction?.predictedHomeScore ?? 0,
				away: prediction?.predictedAwayScore ?? 0
			};
		});
		predictionValues = newValues;
	});

	// Handle form submission result
	$effect(() => {
		if (form) {
			submitting = false;
			if (form?.success) {
				showSuccess = true;
				setTimeout(() => {
					showSuccess = false;
				}, 3000);
			} else {
				showError = true;
				errorMessage = form?.message || 'Failed to save predictions';
				setTimeout(() => {
					showError = false;
				}, 5000);
			}
		}
	});

	// Validate the form before submission
	function validateForm(): boolean {
		// Reset validation state
		invalidPredictions = [];

		// Check for negative scores or invalid inputs
		for (const fixtureId in predictionValues) {
			const prediction = predictionValues[fixtureId];
			const fixture = fixtures.find((f) => f.id === fixtureId);

			// Only validate fixtures that can still be predicted
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

	// Helper functions
	function formatDate(timestamp: number | Date): string {
		const date = new Date(timestamp);
		return date.toLocaleString('en-GB', {
			weekday: 'short',
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getSpecialBadge(fixture: Fixture): { text: string; color: string } | null {
		if (fixture.pointsMultiplier > 1) {
			if (fixture.pointsMultiplier === 3) {
				return { text: '3x Points', color: 'bg-green-400' };
			} else if (fixture.pointsMultiplier === 2) {
				return { text: '2x Points', color: 'bg-red-400' };
			} else {
				return { text: `${fixture.pointsMultiplier}x Points`, color: 'variant-filled-primary' };
			}
		}
		return null;
	}

	function isPredictionComplete(fixtureId: string): boolean {
		return (
			predictionValues[fixtureId]?.home !== undefined &&
			predictionValues[fixtureId]?.away !== undefined
		);
	}

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
			<div class="flex items-center gap-2">
				<div class="rounded-full bg-blue-500 px-3 py-1 text-sm font-medium text-white">
					Current Week: {currentWeek}
				</div>
				{#if week !== currentWeek}
					<div class="rounded-full bg-slate-700 px-3 py-1 text-sm font-medium text-white">
						Viewing Week: {week}
					</div>
				{/if}
			</div>

			<!-- Week selector dropdown -->
			<div class="flex items-center gap-3">
				<label for="week-select" class="font-medium text-slate-200">Jump to Week:</label>
				<select
					id="week-select"
					class="select w-48 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
					bind:value={week}
					onchange={changeWeek}
				>
					{#each weeks as weekOption}
						<option value={Number(weekOption)}>
							Week {weekOption}
							{weekOption === currentWeek
								? ' (Current)'
								: weekOption > currentWeek
									? ' (Future)'
									: ' (Past)'}
						</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	{#if fixtures.length === 0}
		<div class="alert variant-soft-warning rounded-lg p-4 text-center">
			<p class="text-lg">No fixtures available for this week.</p>
		</div>
	{:else}
		<form method="POST" action="?/submitPredictions" use:enhance={handleSubmit}>
			<!-- Prediction summary -->
			<div class="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4 shadow-lg">
				<h2 class="mb-2 text-xl font-semibold">Your Week {week} Predictions</h2>

				{#if fixtures.filter((f) => canPredictFixture(f)).length === 0}
					<p class="text-yellow-400">
						{#if week < currentWeek}
							This week is in the past. No matches are available for prediction.
						{:else if week === currentWeek}
							There are no matches available for prediction at this time. All matches may have
							already started or been completed.
						{:else}
							This is a future week. You can predict matches once the fixtures are upcoming.
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
					<div
						class="rounded-xl border border-slate-700 bg-slate-800/30 p-4 shadow-md transition-all hover:shadow-lg"
						class:border-red-500={invalidPredictions.includes(fixture.id)}
					>
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium text-slate-300">{formatDate(fixture.matchDate)}</span
							>
							{#if getSpecialBadge(fixture)}
								{@const badge = getSpecialBadge(fixture)}
								<span class="badge {badge?.color} rounded-full px-2 py-1 text-xs font-bold"
									>{badge?.text}</span
								>
							{/if}
						</div>

						<div class="flex items-center">
							<div class="flex flex-1 items-center gap-2">
								{#if teams[fixture.homeTeamId]?.logo}
									<img
										src={teams[fixture.homeTeamId].logo}
										alt={teams[fixture.homeTeamId]?.name || fixture.homeTeamId}
										class="h-8 w-8 object-contain"
									/>
								{/if}
								<span class="font-semibold"
									>{teams[fixture.homeTeamId]?.name || 'Unknown Team'}</span
								>
							</div>

							<div class="mx-4 text-center font-bold">vs</div>

							<div class="flex flex-1 items-center justify-end gap-2">
								<span class="font-semibold"
									>{teams[fixture.awayTeamId]?.name || 'Unknown Team'}</span
								>
								{#if teams[fixture.awayTeamId]?.logo}
									<img
										src={teams[fixture.awayTeamId].logo}
										alt={teams[fixture.awayTeamId]?.name || fixture.awayTeamId}
										class="h-8 w-8 object-contain"
									/>
								{/if}
							</div>
						</div>

						<div class="mt-4">
							{#if canPredictFixture(fixture)}
								<div class="flex items-center justify-center gap-4">
									<div class="flex flex-col items-center">
										<label for="home-{fixture.id}" class="mb-1 text-sm text-slate-300">
											{teams[fixture.homeTeamId]?.shortName || 'Home'}
										</label>
										<input
											id="home-{fixture.id}"
											name="prediction-{fixture.id}-home"
											type="number"
											min="0"
											class="w-16 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-center text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
											class:border-red-500={invalidPredictions.includes(fixture.id)}
											value={predictionValues[fixture.id]?.home ?? 0}
											oninput={(e) => {
												// Initialize the fixture's prediction if it doesn't exist
												if (!predictionValues[fixture.id]) {
													predictionValues = {
														...predictionValues,
														[fixture.id]: { home: 0, away: 0 }
													};
												}

												// Update the home score directly in the input event
												const updatedValues = { ...predictionValues };
												const target = e.currentTarget as HTMLInputElement;
												updatedValues[fixture.id].home = Math.max(0, Number(target.value) || 0);
												predictionValues = updatedValues;
											}}
										/>
									</div>

									<div class="font-bold">-</div>

									<div class="flex flex-col items-center">
										<label for="away-{fixture.id}" class="mb-1 text-sm text-slate-300">
											{teams[fixture.awayTeamId]?.shortName || 'Away'}
										</label>
										<input
											id="away-{fixture.id}"
											name="prediction-{fixture.id}-away"
											type="number"
											min="0"
											class="w-16 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-center text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
											class:border-red-500={invalidPredictions.includes(fixture.id)}
											value={predictionValues[fixture.id]?.away ?? 0}
											oninput={(e) => {
												// Initialize the fixture's prediction if it doesn't exist
												if (!predictionValues[fixture.id]) {
													predictionValues = {
														...predictionValues,
														[fixture.id]: { home: 0, away: 0 }
													};
												}

												// Update the away score directly in the input event
												const updatedValues = { ...predictionValues };
												const target = e.currentTarget as HTMLInputElement;
												updatedValues[fixture.id].away = Math.max(0, Number(target.value) || 0);
												predictionValues = updatedValues;
											}}
										/>
									</div>
								</div>
								{#if isPredictionComplete(fixture.id)}
									<div class="mt-2 text-center text-sm text-green-400">Prediction set</div>
								{:else}
									<div class="mt-2 text-center text-sm text-yellow-400">Enter your prediction</div>
								{/if}
							{:else if fixture.status === 'in_play' && fixture.homeScore !== undefined && fixture.awayScore !== undefined}
								<div class="text-center">
									<div class="flex items-center justify-center gap-2">
										<span
											class="animate-pulse rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white"
											>LIVE</span
										>
										<div class="text-xl font-bold">
											{fixture.homeScore} - {fixture.awayScore}
										</div>
									</div>
									<div class="mt-1 text-sm opacity-75">Match in progress</div>
									{#if predictions[fixture.id]}
										<div class="mt-2 text-sm">
											Your prediction: {predictions[fixture.id].predictedHomeScore} - {predictions[
												fixture.id
											].predictedAwayScore}
										</div>
									{/if}
								</div>
							{:else if fixture.homeScore !== undefined && fixture.awayScore !== undefined}
								<div class="text-center">
									<div class="text-xl font-bold">
										{fixture.homeScore} - {fixture.awayScore}
									</div>
									<div class="mt-1 text-sm opacity-75">Final Score</div>
									{#if predictions[fixture.id]}
										<div class="mt-2 text-sm">
											Your prediction: {predictions[fixture.id].predictedHomeScore} - {predictions[
												fixture.id
											].predictedAwayScore}
											{#if predictions[fixture.id].points !== undefined}
												<div class="mt-1 font-medium">
													Points: <span class="text-green-400"
														>{predictions[fixture.id].points}</span
													>
												</div>
											{/if}
										</div>
									{:else}
										<div class="mt-2 text-sm text-red-400">No prediction made</div>
									{/if}
								</div>
							{:else}
								<div class="text-center">
									<div class="text-sm opacity-75">
										{#if new Date(fixture.matchDate) < new Date()}
											Result pending
										{:else}
											{new Date(fixture.matchDate) < new Date(new Date().getTime() + 15 * 60 * 1000)
												? 'Match starting soon - prediction window closed'
												: 'Prediction window closed for other reasons'}
										{/if}
									</div>
									{#if predictions[fixture.id]}
										<div class="mt-2 text-sm">
											Your prediction: {predictions[fixture.id].predictedHomeScore} - {predictions[
												fixture.id
											].predictedAwayScore}
										</div>
									{:else}
										<div class="mt-2 text-sm text-red-400">No prediction made</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
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
