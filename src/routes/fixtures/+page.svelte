<script lang="ts">
	import type { Fixture, Team } from '$lib/server/db/schema';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { Check, X } from '@lucide/svelte';

	// Get data from props
	let { data, form } = $props();

	// Use derived values to extract from data props
	// These will automatically update when data changes
	let fixtures = $derived(
		[...data.fixtures].sort(
			(a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
		)
	);
	let teams = $derived(data.teams);
	let week = $state(data.week);
	let weeks = $derived(data.weeks);
	let currentWeek = $state(data.currentWeek);

	// State for notifications
	let showUpdateNotification = $state(false);
	let updatedFixturesCount = $state(0);
	let completedFixturesCount = $state(0);
	let inPlayFixturesCount = $state(0);

	// Explicitly check for updates on the fixtures page
	onMount(async () => {
		try {
			const formData = new FormData();
			const response = await fetch('?/checkUpdates', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.success && result.updated > 0) {
				updatedFixturesCount = result.updated;
				completedFixturesCount = result.completed || 0;
				inPlayFixturesCount = result.inPlay || 0;
				showUpdateNotification = true;

				// Auto-hide notification after 5 seconds
				setTimeout(() => {
					showUpdateNotification = false;
				}, 5000);

				// Reload the page to show the updated fixtures
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			}
		} catch (err) {
			console.error('Error checking for fixture updates:', err);
		}
	});

	// Change week from dropdown
	function changeWeek(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newWeek = target.value;
		goto(`?week=${newWeek}`);
	}

	// Navigate to predictions page for a specific week
	function goToPredictions() {
		goto(`/predictions?week=${week}`);
	}

	// Dismiss notification
	function dismissNotification() {
		showUpdateNotification = false;
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
</script>

<div class="container mx-auto max-w-6xl p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Week {week} Fixtures</h1>
	</div>

	{#if showUpdateNotification}
		<div class="mb-4 rounded-lg bg-green-500/20 p-4 text-green-100 shadow-lg">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Check class="size-5" />
					<div>
						<span
							>Updated {updatedFixturesCount} fixture{updatedFixturesCount !== 1 ? 's' : ''}!</span
						>
						{#if completedFixturesCount > 0 && inPlayFixturesCount > 0}
							<div class="mt-1 text-sm">
								{completedFixturesCount} completed, {inPlayFixturesCount} in progress
							</div>
						{:else if completedFixturesCount > 0}
							<div class="mt-1 text-sm">
								{completedFixturesCount} match{completedFixturesCount !== 1 ? 'es' : ''} with final scores
							</div>
						{:else if inPlayFixturesCount > 0}
							<div class="mt-1 text-sm">
								{inPlayFixturesCount} match{inPlayFixturesCount !== 1 ? 'es' : ''} in progress
							</div>
						{/if}
					</div>
				</div>
				<button
					aria-label="Dismiss notification"
					onclick={dismissNotification}
					class="text-green-100 hover:text-white"
				>
					<X class="size-5" />
				</button>
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
					class="select w-40 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
					bind:value={week}
					onchange={changeWeek}
				>
					{#each weeks as weekOption}
						<option value={Number(weekOption)}>
							Week {weekOption}
							{weekOption === currentWeek ? '(Current)' : ''}
						</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	{#if fixtures.length === 0}
		<div class="alert variant-soft-warning rounded-lg p-4 text-center">
			<p class="text-lg">
				No fixtures available for this week. Click "Generate Fixtures" to create some.
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			{#each fixtures as fixture}
				<div
					class="rounded-xl border border-slate-700 bg-slate-800/30 p-4 shadow-md transition-all hover:shadow-lg"
				>
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium text-slate-300">{formatDate(fixture.matchDate)}</span>
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
							<span class="font-semibold">{teams[fixture.homeTeamId]?.name || 'Unknown Team'}</span>
						</div>

						<div class="mx-4 text-center font-bold">vs</div>

						<div class="flex flex-1 items-center justify-end gap-2">
							<span class="font-semibold">{teams[fixture.awayTeamId]?.name || 'Unknown Team'}</span>
							{#if teams[fixture.awayTeamId]?.logo}
								<img
									src={teams[fixture.awayTeamId].logo}
									alt={teams[fixture.awayTeamId]?.name || fixture.awayTeamId}
									class="h-8 w-8 object-contain"
								/>
							{/if}
						</div>
					</div>

					<div class="mt-4 flex justify-center">
						{#if new Date(fixture.matchDate) < new Date()}
							{#if fixture.status === 'in_play' && fixture.homeScore !== undefined && fixture.awayScore !== undefined}
								<div class="text-center">
									<div class="flex items-center gap-2">
										<span
											class="animate-pulse rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white"
											>LIVE</span
										>
										<div class="text-xl font-bold">
											{fixture.homeScore} - {fixture.awayScore}
										</div>
									</div>
									<div class="mt-1 text-sm opacity-75">Match in progress</div>
								</div>
							{:else if fixture.homeScore !== undefined && fixture.awayScore !== undefined}
								<div class="text-center">
									<div class="text-xl font-bold">
										{fixture.homeScore} - {fixture.awayScore}
									</div>
									<div class="mt-1 text-sm opacity-75">Final Score</div>
								</div>
							{:else}
								<div class="text-center">
									<div class="text-sm opacity-75">Result pending</div>
								</div>
							{/if}
						{:else}
							<button
								onclick={goToPredictions}
								class="rounded-xl border border-blue-600 bg-blue-700 px-4 py-2 font-medium text-white transition-all hover:bg-blue-600"
							>
								Make Prediction
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
