<script lang="ts">
	import { onMount } from 'svelte';
	import type { Fixture, Team } from '$lib/server/db/schema';

	let fixtures: Fixture[] = [];
	let teams: Record<string, Team> = {};
	let loading = true;
	let error = '';
	let week = 0;
	let generating = false;

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

	// Generate fixtures for the current week
	async function generateFixtures() {
		generating = true;
		error = '';

		try {
			const response = await fetch('/api/fixtures/generate', {
				method: 'POST'
			});
			const data = await response.json();

			if (data.success) {
				fixtures = data.fixtures;
				await loadTeams();
			} else {
				error = data.message || 'Failed to generate fixtures';
			}
		} catch (err) {
			error = 'An error occurred while generating fixtures';
			console.error(err);
		} finally {
			generating = false;
		}
	}

	onMount(loadFixtures);
</script>

<div class="container mx-auto max-w-4xl p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="h1">Week {week} Fixtures</h1>
		<div>
			<button onclick={generateFixtures} class="btn preset-filled" disabled={generating}>
				{#if generating}
					<span class="animate-spin">⟳</span>
					<span>Generating...</span>
				{:else if fixtures.length > 0}
					<span>Regenerate Fixtures</span>
				{:else}
					<span>Generate Fixtures</span>
				{/if}
			</button>
		</div>
	</div>

	{#if loading}
		<div class="card p-4">
			<div class="flex items-center gap-4">
				<p>Loading fixtures...</p>
			</div>
		</div>
	{:else if error}
		<div class="alert variant-filled-error">
			<p>{error}</p>
		</div>
	{:else if fixtures.length === 0}
		<div class="alert variant-soft-warning">
			<p>No fixtures available for this week. Click "Generate Fixtures" to create some.</p>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each fixtures as fixture}
				<div class="card preset-filled-surface-100-900 border-surface-200-800 border-[1px] p-4">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm opacity-75">{formatDate(fixture.matchDate)}</span>
						{#if getSpecialBadge(fixture)}
							{@const badge = getSpecialBadge(fixture)}
							<span class="badge {badge?.color}">{badge?.text}</span>
						{/if}
					</div>

					<div class="flex items-center">
						<div class="flex flex-1 items-center gap-2">
							{#if teams[fixture.homeTeamId]?.logo}
								<img
									src={teams[fixture.homeTeamId].logo}
									alt={teams[fixture.homeTeamId]?.name || fixture.homeTeamId}
									class="h-10 w-10"
								/>
							{/if}
							<span class="font-semibold">{teams[fixture.homeTeamId]?.name || 'Unknown Team'}</span>
						</div>

						<div class="mx-4 w-16 text-center text-xl font-bold">vs</div>

						<div class="flex flex-1 items-center justify-end gap-2">
							<span class="font-semibold">{teams[fixture.awayTeamId]?.name || 'Unknown Team'}</span>
							{#if teams[fixture.awayTeamId]?.logo}
								<img
									src={teams[fixture.awayTeamId].logo}
									alt={teams[fixture.awayTeamId]?.name || fixture.awayTeamId}
									class="h-10 w-10"
								/>
							{/if}
						</div>
					</div>

					<div class="mt-4 flex justify-center">
						<a href="/predictions" class="btn preset-filled"> Make Prediction </a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
