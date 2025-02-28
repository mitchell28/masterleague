<script lang="ts">
	import { onMount } from 'svelte';
	import type { Fixture, Team } from '$lib/server/db/schema';

	let fixtures: Fixture[] = [];
	let teams: Record<string, Team> = {};
	let loading = true;
	let error = '';
	let success = '';
	let week = 0;
	let selectedWeek = 0;
	let availableWeeks: number[] = [];
	let processingFixture = '';

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

	// Load weeks with fixtures
	async function loadAvailableWeeks() {
		try {
			const response = await fetch('/api/fixtures/weeks');
			const data = await response.json();

			if (data.success) {
				availableWeeks = data.weeks;

				// Set selected week to current week by default
				if (availableWeeks.length > 0) {
					selectedWeek = data.currentWeek;
					await loadFixtures(selectedWeek);
				}
			} else {
				error = data.message || 'Failed to load available weeks';
			}
		} catch (err) {
			error = 'An error occurred while loading available weeks';
			console.error(err);
		}
	}

	// Load fixtures for a specific week
	async function loadFixtures(weekId: number) {
		loading = true;
		error = '';
		success = '';

		try {
			const response = await fetch(`/api/fixtures/week/${weekId}`);
			const data = await response.json();

			if (data.success) {
				fixtures = data.fixtures;
				week = weekId;

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

	// Handle week change
	async function handleWeekChange() {
		await loadFixtures(selectedWeek);
	}

	// Save fixture result
	async function saveResult(fixture: Fixture, homeScore: number, awayScore: number) {
		error = '';
		success = '';
		processingFixture = fixture.id;

		try {
			const response = await fetch('/api/admin/fixtures/result', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					fixtureId: fixture.id,
					homeScore,
					awayScore
				})
			});

			const data = await response.json();

			if (data.success) {
				success = `Result saved and processed successfully for ${teams[fixture.homeTeamId]?.name} vs ${teams[fixture.awayTeamId]?.name}`;

				// Reload fixtures to update UI
				await loadFixtures(selectedWeek);
			} else {
				error = data.message || 'Failed to save result';
			}
		} catch (err) {
			error = 'An error occurred while saving the result';
			console.error(err);
		} finally {
			processingFixture = '';
		}
	}

	// References to home and away score inputs for each fixture
	const homeScoreInputs: Record<string, number> = {};
	const awayScoreInputs: Record<string, number> = {};

	onMount(loadAvailableWeeks);
</script>

<div class="space-y-6">
	<h2 class="h2">Enter Match Results</h2>

	<div class="card p-4">
		<label class="label">
			<span>Select Week</span>
			<select bind:value={selectedWeek} on:change={handleWeekChange} class="select">
				{#each availableWeeks as weekId}
					<option value={weekId}>Week {weekId}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if error}
		<div class="alert variant-filled-error">
			<p>{error}</p>
		</div>
	{/if}

	{#if success}
		<div class="alert variant-filled-success">
			<p>{success}</p>
		</div>
	{/if}

	{#if loading}
		<div class="card p-4">
			<div class="flex items-center gap-4">
				<p>Loading fixtures...</p>
			</div>
		</div>
	{:else if fixtures.length === 0}
		<div class="alert variant-filled-warning">
			<p>No fixtures available for week {selectedWeek}.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4">
			{#each fixtures as fixture}
				<div class="card variant-glass p-4">
					<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
						<!-- Home Team -->
						<div class="text-right">
							<p class="font-bold">{teams[fixture.homeTeamId]?.name || 'Unknown Team'}</p>
							<div class="mt-2 flex justify-end">
								<input
									type="number"
									min="0"
									class="input w-16 text-center"
									placeholder="0"
									bind:value={homeScoreInputs[fixture.id]}
									disabled={fixture.status === 'completed' || processingFixture === fixture.id}
								/>
							</div>
						</div>

						<!-- VS and Game Info -->
						<div class="text-center">
							<p class="font-bold">vs</p>
							<p class="text-xs opacity-70">{formatDate(fixture.matchDate)}</p>
							{#if fixture.status === 'completed'}
								<span class="badge variant-filled-success">Completed</span>
							{:else}
								<span class="badge variant-filled-warning">Pending</span>
							{/if}
						</div>

						<!-- Away Team -->
						<div>
							<p class="font-bold">{teams[fixture.awayTeamId]?.name || 'Unknown Team'}</p>
							<div class="mt-2">
								<input
									type="number"
									min="0"
									class="input w-16 text-center"
									placeholder="0"
									bind:value={awayScoreInputs[fixture.id]}
									disabled={fixture.status === 'completed' || processingFixture === fixture.id}
								/>
							</div>
						</div>
					</div>

					<!-- Save Button -->
					{#if fixture.status !== 'completed'}
						<div class="mt-4 flex justify-center">
							<button
								class="btn variant-filled-primary"
								on:click={() =>
									saveResult(
										fixture,
										homeScoreInputs[fixture.id] || 0,
										awayScoreInputs[fixture.id] || 0
									)}
								disabled={processingFixture === fixture.id}
							>
								{#if processingFixture === fixture.id}
									<span class="animate-spin">⟳</span>
									<span>Processing...</span>
								{:else}
									<span>Save Result</span>
								{/if}
							</button>
						</div>
					{:else}
						<div class="mt-4 flex justify-center">
							<p class="text-sm">
								Final Score: {fixture.homeScore} - {fixture.awayScore}
							</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
