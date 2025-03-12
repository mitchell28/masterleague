<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Fixture, Team } from '$lib/server/db/schema';
	import type { PageData } from './$types';
	import { AlertCircle, CheckCircle2, AlertTriangle, RotateCw } from '@lucide/svelte';

	// Get data from the server
	let { data } = $props<{ data: PageData }>();

	// State variables
	let fixtures = $state<Fixture[]>([]);
	let teams = $state<Record<string, Team>>({});
	let error = $state('');
	let success = $state('');
	let selectedWeek = $state(0);
	let availableWeeks = $state<number[]>([]);
	let processingFixture = $state('');

	// Input state for score entries
	let homeScoreInputs = $state<Record<string, number>>({});
	let awayScoreInputs = $state<Record<string, number>>({});

	// Derived values that depend on data from server
	let loading = $derived(false);

	// Sync data from server whenever it changes
	$effect(() => {
		fixtures = data.fixtures;
		teams = data.teams;
		availableWeeks = data.availableWeeks;
		selectedWeek = data.selectedWeek;
	});

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

	// Handle week change by navigating to the URL with the new week
	function handleWeekChange() {
		window.location.href = `?week=${selectedWeek}`;
	}

	// Clear messages
	function clearMessages() {
		error = '';
		success = '';
	}

	// Handle form submission result
	function handleActionResult(result: any) {
		if (result.type === 'success') {
			if (result.data.success) {
				const homeTeam = teams[result.data.fixture.homeTeamId]?.name || 'Home Team';
				const awayTeam = teams[result.data.fixture.awayTeamId]?.name || 'Away Team';
				success = `Result saved and processed successfully for ${homeTeam} vs ${awayTeam}`;

				// If we get updated fixture data, update our local state
				if (result.data.fixture) {
					fixtures = fixtures.map((f) =>
						f.id === result.data.fixture.id ? result.data.fixture : f
					);
				}
			} else {
				error = result.data.message || 'Failed to save result';
			}
		} else {
			error = 'An error occurred while saving the result';
		}
		processingFixture = '';
	}
</script>

{#snippet fixtureHeader(fixture: Fixture)}
	<div class="mb-2 flex items-center justify-between">
		<span class="text-sm font-medium text-slate-300">{formatDate(fixture.matchDate)}</span>
		{#if fixture.status === 'completed'}
			<span class="badge rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white"
				>Completed</span
			>
		{:else}
			<span class="badge rounded-full bg-yellow-500 px-2 py-1 text-xs font-bold text-white"
				>Pending</span
			>
		{/if}
	</div>
{/snippet}

{#snippet teamLogo(teamId: string)}
	<img
		src={teams[teamId]?.logo}
		alt={teams[teamId]?.name || 'Unknown Team'}
		class="h-8 w-8 object-contain"
	/>
{/snippet}

{#snippet teamDisplay(teamId: string, isHome: boolean)}
	<div class={`flex flex-1 items-center ${isHome ? '' : 'justify-end'} gap-2`}>
		{#if isHome}
			{#if teams[teamId]?.logo}
				{@render teamLogo(teamId)}
			{/if}
			<span class="font-semibold">{teams[teamId]?.name || 'Unknown Team'}</span>
		{:else}
			<span class="font-semibold">{teams[teamId]?.name || 'Unknown Team'}</span>
			{#if teams[teamId]?.logo}
				{@render teamLogo(teamId)}
			{/if}
		{/if}
	</div>
{/snippet}

{#snippet scoreForm(fixture: Fixture)}
	<form
		method="POST"
		action="?/saveResult"
		use:enhance={() => {
			processingFixture = fixture.id;
			clearMessages();

			return async ({ result }) => {
				handleActionResult(result);
			};
		}}
	>
		<input type="hidden" name="fixtureId" value={fixture.id} />

		<div class="mt-4 flex items-center justify-center gap-4">
			<div class="flex items-center gap-2">
				<input
					type="number"
					name="homeScore"
					min="0"
					class="w-16 rounded-md border border-gray-600 bg-slate-700 px-3 py-2 text-center text-lg font-bold shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					placeholder="0"
					bind:value={homeScoreInputs[fixture.id]}
					disabled={processingFixture === fixture.id}
				/>
				<span class="text-xl">-</span>
				<input
					type="number"
					name="awayScore"
					min="0"
					class="w-16 rounded-md border border-gray-600 bg-slate-700 px-3 py-2 text-center text-lg font-bold shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					placeholder="0"
					bind:value={awayScoreInputs[fixture.id]}
					disabled={processingFixture === fixture.id}
				/>
			</div>
		</div>

		<div class="mt-4 flex justify-center">
			<button
				type="submit"
				class="rounded-xl border border-blue-600 bg-blue-700 px-4 py-2 font-medium text-white transition-all hover:bg-blue-600"
				disabled={processingFixture === fixture.id}
			>
				{#if processingFixture === fixture.id}
					<div class="flex items-center justify-center gap-2">
						<RotateCw class="h-4 w-4 animate-spin" />
						<span>Processing...</span>
					</div>
				{:else}
					<span>Save Result</span>
				{/if}
			</button>
		</div>
	</form>
{/snippet}

{#snippet fixtureCard(fixture: Fixture)}
	<div
		class="rounded-xl border border-slate-700 bg-slate-800/30 p-4 shadow-md transition-all hover:shadow-lg"
	>
		{@render fixtureHeader(fixture)}

		<div class="flex items-center">
			{@render teamDisplay(fixture.homeTeamId, true)}

			{#if fixture.status === 'completed'}
				<div class="mx-4 text-center font-bold">
					{fixture.homeScore} - {fixture.awayScore}
				</div>
			{:else}
				<div class="mx-4 text-center font-bold">vs</div>
			{/if}

			{@render teamDisplay(fixture.awayTeamId, false)}
		</div>

		{#if fixture.status !== 'completed'}
			{@render scoreForm(fixture)}
		{/if}
	</div>
{/snippet}

<div class="container mx-auto space-y-6 p-4">
	<header class="mb-6">
		<h2 class="border-b border-blue-500 pb-2 text-2xl font-bold text-blue-600">Match Results</h2>
	</header>

	<div class="rounded-lg bg-gray-100 p-4 shadow-lg dark:bg-gray-800">
		<label class="flex items-center gap-4">
			<span class="font-semibold">Select Week:</span>
			<select
				bind:value={selectedWeek}
				onchange={handleWeekChange}
				class="w-40 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
			>
				{#each availableWeeks as weekId}
					<option value={weekId}>Week {weekId}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if error}
		<div class="rounded-lg bg-red-500 p-4 text-white shadow-lg">
			<div class="flex items-center gap-4">
				<AlertCircle class="h-6 w-6 flex-shrink-0" />
				<p>{error}</p>
			</div>
		</div>
	{/if}

	{#if success}
		<div class="rounded-lg bg-green-500 p-4 text-white shadow-lg">
			<div class="flex items-center gap-4">
				<CheckCircle2 class="h-6 w-6 flex-shrink-0" />
				<p>{success}</p>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="rounded-lg bg-gray-100 p-6 shadow-lg dark:bg-gray-800">
			<div class="flex items-center justify-center gap-4">
				<div
					class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
				></div>
				<p class="text-lg">Loading fixtures...</p>
			</div>
		</div>
	{:else if fixtures.length === 0}
		<div class="rounded-lg bg-yellow-500 p-4 text-white shadow-lg">
			<div class="flex items-center gap-4">
				<AlertTriangle class="h-6 w-6 flex-shrink-0" />
				<p>No fixtures available for week {selectedWeek}.</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			{#each fixtures as fixture}
				{@render fixtureCard(fixture)}
			{/each}
		</div>
	{/if}
</div>
