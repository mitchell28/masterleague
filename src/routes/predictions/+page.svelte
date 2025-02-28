<script lang="ts">
	import { onMount } from 'svelte';
	import type { Fixture, Team } from '$lib/server/db/schema';
	import { predictionSchema } from '$lib/validation/schemas';
	import { z } from 'zod';

	let fixtures: Fixture[] = [];
	let teams: Record<string, Team> = {};
	let loading = true;
	let error = '';
	let submitting = false;
	let success = false;
	let week = 0;

	// Predictions state
	let predictions: Record<string, { homeScore: number; awayScore: number }> = {};
	// Validation errors
	let validationErrors: Record<string, { homeScore?: string; awayScore?: string }> = {};

	// Format date for display
	function formatDate(timestamp: number | Date): string {
		const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
		return date.toLocaleString('en-GB', {
			weekday: 'short',
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Get badge for special fixtures
	function getSpecialBadge(fixture: Fixture): { text: string; color: string } | null {
		if (fixture.pointsMultiplier > 1) {
			if (fixture.pointsMultiplier === 3) {
				return { text: '3x Points', color: 'variant-filled-error' };
			} else if (fixture.pointsMultiplier === 2) {
				return { text: '2x Points', color: 'variant-filled-warning' };
			} else {
				return { text: `${fixture.pointsMultiplier}x Points`, color: 'variant-filled-primary' };
			}
		}
		return null;
	}

	// Load current fixtures
	async function loadFixtures() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/fixtures/current');
			const data = await response.json();

			if (data.success) {
				fixtures = data.fixtures;
				week = data.week;

				// Initialize predictions object
				fixtures.forEach((fixture) => {
					predictions[fixture.id] = { homeScore: 0, awayScore: 0 };
				});

				// Load team data if we have fixtures
				if (fixtures.length > 0) {
					await loadTeams();
				}
			} else {
				error = data.message || 'Failed to load fixtures';
			}
		} catch (err) {
			error = 'An error occurred while loading fixtures';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	// Load team data
	async function loadTeams() {
		try {
			// In a real app, you'd fetch this from an API
			// For simplicity, we'll use the data from the fixtures
			const teamIds = new Set<string>();
			fixtures.forEach((fixture) => {
				teamIds.add(fixture.homeTeamId);
				teamIds.add(fixture.awayTeamId);
			});

			// Fetch team data for each team ID
			const teamsResponse = await fetch('/api/teams');
			const teamsData = await teamsResponse.json();

			if (teamsData.success) {
				// Convert array to record for easy lookup
				teams = teamsData.teams.reduce((acc: Record<string, Team>, team: Team) => {
					acc[team.id] = team;
					return acc;
				}, {});
			}
		} catch (err) {
			console.error('Failed to load team data:', err);
		}
	}

	// Validate a single prediction
	function validatePrediction(fixtureId: string, scores: { homeScore: number; awayScore: number }) {
		try {
			predictionSchema.parse({
				fixtureId,
				homeScore: Number(scores.homeScore),
				awayScore: Number(scores.awayScore)
			});
			// Clear any previous errors
			validationErrors[fixtureId] = {};
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				validationErrors[fixtureId] = {};

				error.errors.forEach((err) => {
					const path = err.path[0];
					if (path === 'homeScore' || path === 'awayScore') {
						if (validationErrors[fixtureId]) {
							validationErrors[fixtureId][path as 'homeScore' | 'awayScore'] = err.message;
						}
					}
				});
			}
			return false;
		}
	}

	// Handle input changes
	function handleInput(fixtureId: string, field: 'homeScore' | 'awayScore', event: Event) {
		const target = event.target as HTMLInputElement;
		const value = parseInt(target.value);

		// Update the prediction
		predictions[fixtureId] = {
			...predictions[fixtureId],
			[field]: isNaN(value) ? 0 : value
		};

		// Validate on input
		validatePrediction(fixtureId, predictions[fixtureId]);
	}

	// Submit predictions
	async function submitPredictions(e: Event) {
		e.preventDefault();
		submitting = true;
		error = '';
		success = false;

		// Validate all predictions before submission
		let isValid = true;
		Object.entries(predictions).forEach(([fixtureId, scores]) => {
			if (!validatePrediction(fixtureId, scores)) {
				isValid = false;
			}
		});

		if (!isValid) {
			submitting = false;
			error = 'Please fix validation errors before submitting';
			return;
		}

		try {
			// Format predictions for API
			const predictionArray = Object.entries(predictions).map(([fixtureId, scores]) => ({
				fixtureId,
				homeScore: Number(scores.homeScore),
				awayScore: Number(scores.awayScore)
			}));

			const response = await fetch('/api/predictions/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ predictions: predictionArray })
			});

			const data = await response.json();

			if (data.success) {
				success = true;
				if (data.message) {
					// If server returned a message, show it
					error = data.message;
				}
			} else {
				error = data.message || 'Failed to submit predictions';

				// Handle validation errors from server
				if (data.errors && Array.isArray(data.errors)) {
					data.errors.forEach((err: { path: string; message: string }) => {
						const pathParts = err.path.split('.');
						if (pathParts.length === 3 && pathParts[0] === 'predictions') {
							const index = parseInt(pathParts[1]);
							const field = pathParts[2];
							const fixtureId = predictionArray[index]?.fixtureId;

							if (fixtureId && (field === 'homeScore' || field === 'awayScore')) {
								validationErrors[fixtureId] = validationErrors[fixtureId] || {};
								if (validationErrors[fixtureId]) {
									validationErrors[fixtureId][field as 'homeScore' | 'awayScore'] = err.message;
								}
							}
						}
					});
				}
			}
		} catch (err) {
			error = 'An error occurred while submitting predictions';
			console.error(err);
		} finally {
			submitting = false;
		}
	}

	// Check if all predictions are valid
	function areAllPredictionsValid(): boolean {
		return fixtures.every((fixture) => {
			const prediction = predictions[fixture.id];

			// First check if prediction exists with basic validation
			const basicCheck =
				prediction &&
				typeof prediction.homeScore === 'number' &&
				typeof prediction.awayScore === 'number' &&
				prediction.homeScore >= 0 &&
				prediction.awayScore >= 0;

			// If basic check passes, perform full validation
			return basicCheck && validatePrediction(fixture.id, prediction);
		});
	}

	onMount(loadFixtures);
</script>

<div class="container mx-auto px-10">
	<h1 class="h2 mb-6 font-bold">Week {week} Predictions</h1>

	{#if loading}
		<div class="alert variant-filled-primary">
			<p>Loading fixtures...</p>
		</div>
	{:else if error && !success}
		<div class="alert variant-filled-error mb-4">
			<p>{error}</p>
		</div>
	{:else if success}
		<div class="alert variant-filled-success mb-4">
			<p>Your predictions have been submitted successfully!</p>
			<div class="mt-4">
				<a href="/leaderboard" class="anchor">View Leaderboard</a>
			</div>
		</div>
	{:else if fixtures.length === 0}
		<div class="alert variant-filled-warning">
			<p>No fixtures available for this week.</p>
			<div class="mt-4">
				<a href="/fixtures" class="anchor">Generate Fixtures</a>
			</div>
		</div>
	{:else}
		<form on:submit={submitPredictions} class="flex flex-col gap-4">
			{#each fixtures as fixture}
				{@const badge = getSpecialBadge(fixture)}
				<div
					class="card preset-filled-surface-100-900 border-surface-200-800 relative border-[1px]"
				>
					<div class="@container p-4">
						<div class="mb-4 flex items-center justify-between">
							<span class="opacity-75">{formatDate(fixture.matchDate)}</span>
							{#if badge}
								<span class="rounded-xl bg-slate-700 p-3 text-white transition-all {badge.color}">
									{badge.text}
								</span>
							{/if}
						</div>

						<div class="flex flex-col items-center">
							<div class="mb-4 flex w-full items-center justify-between">
								<!-- Home team -->
								<div class="flex items-center">
									{#if teams[fixture.homeTeamId]?.logo}
										<img
											src={teams[fixture.homeTeamId].logo}
											alt={teams[fixture.homeTeamId].name}
											class="mr-2 h-8 w-8"
										/>
									{/if}
									<span class="text-lg font-bold"
										>{teams[fixture.homeTeamId]?.name || 'Home Team'}</span
									>
								</div>

								<!-- Away team -->
								<div class="flex items-center">
									<span class="text-lg font-bold"
										>{teams[fixture.awayTeamId]?.name || 'Away Team'}</span
									>
									{#if teams[fixture.awayTeamId]?.logo}
										<img
											src={teams[fixture.awayTeamId].logo}
											alt={teams[fixture.awayTeamId].name}
											class="ml-2 h-8 w-8"
										/>
									{/if}
								</div>
							</div>

							<!-- Score inputs -->
							<div
								class=" inset-0 flex w-full items-center justify-center gap-2 @[500px]:absolute @[500px]:mt-5"
							>
								<div class="flex flex-col">
									<input
										type="number"
										class="w-16 rounded-xl bg-slate-800 p-2 text-center {validationErrors[
											fixture.id
										]?.homeScore
											? 'bg-error-500 '
											: ''}"
										min="0"
										max="99"
										on:input={(e) => handleInput(fixture.id, 'homeScore', e)}
										bind:value={predictions[fixture.id].homeScore}
									/>
									{#if validationErrors[fixture.id]?.homeScore}
										<small class="text-error-500">{validationErrors[fixture.id].homeScore}</small>
									{/if}
								</div>
								<span class="text-lg">:</span>
								<div class="flex flex-col">
									<input
										type="number"
										class="w-16 rounded-xl bg-slate-800 p-2 text-center {validationErrors[
											fixture.id
										]?.awayScore
											? 'bg-error-500 '
											: ''}"
										min="0"
										max="99"
										on:input={(e) => handleInput(fixture.id, 'awayScore', e)}
										bind:value={predictions[fixture.id].awayScore}
									/>
									{#if validationErrors[fixture.id]?.awayScore}
										<small class="text-error-500">{validationErrors[fixture.id].awayScore}</small>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}

			<div class="flex justify-end">
				<button
					type="submit"
					class="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-white transition-all hover:bg-slate-700"
					disabled={submitting || !areAllPredictionsValid()}
				>
					{#if submitting}
						<span class="loading loading-spinner"></span> Submitting...
					{:else}
						Submit Predictions
					{/if}
				</button>
			</div>
		</form>
	{/if}
</div>
