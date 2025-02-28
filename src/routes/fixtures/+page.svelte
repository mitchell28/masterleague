<script lang="ts">
	import type { Fixture, Team } from '$lib/server/db/schema';
	import { enhance } from '$app/forms';

	let { data } = $props();

	let fixtures: Fixture[] = data.fixtures;
	let teams: Record<string, Team> = data.teams;
	let week = data.week;
	let generating = $state(false);

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
</script>

<div class="container mx-auto max-w-4xl p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="h1">Week {week} Fixtures</h1>
		<div>
			<form
				action="?/generateFixtures"
				method="POST"
				use:enhance={() => {
					generating = true;

					return async ({ result }) => {
						generating = false;
						if (result.type === 'success') {
							// Refresh the page to get updated data
							window.location.reload();
						}
					};
				}}
			>
				<button
					type="submit"
					class="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-white transition-all hover:bg-slate-700"
					disabled={generating}
				>
					{#if generating}
						<span class="animate-spin">⟳</span>
						<span>Generating...</span>
					{:else if fixtures.length > 0}
						<span>Regenerate Fixtures</span>
					{:else}
						<span>Generate Fixtures</span>
					{/if}
				</button>
			</form>
		</div>
	</div>

	{#if fixtures.length === 0}
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
