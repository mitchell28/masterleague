<script lang="ts">
	import type { StandingsEntry } from './+page.server';
	import { RefreshCcw, Trophy, TrendingUp, TrendingDown, Minus } from '@lucide/svelte';

	// Props
	let { data } = $props<{
		data: {
			standings: StandingsEntry[];
			matchday: number | null;
			lastUpdated: string | null;
			error?: string;
		};
	}>();

	// Derive standings
	let standings = $derived(data.standings || []);

	// Helper to get position styling - plain style like leaderboard
	function getPositionClass(): string {
		return 'bg-slate-700/80';
	}

	// Helper to render form icons
	function getFormClass(result: string): string {
		switch (result.toUpperCase()) {
			case 'W':
				return 'bg-green-600 text-white';
			case 'D':
				return 'bg-slate-500 text-white';
			case 'L':
				return 'bg-red-600 text-white';
			default:
				return 'bg-slate-700 text-slate-400';
		}
	}

	// Format last updated time
	function formatLastUpdated(dateString: string | null): string {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		return date.toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="mx-auto mt-22">
	<!-- Header Section -->
	<div class="relative mb-4 sm:mb-6">
		<div class="font-display w-full overflow-hidden bg-slate-900">
			<div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
				<!-- Mobile Layout -->
				<div class="flex flex-col gap-4 sm:hidden">
					<div class="text-center">
						<h1 class="text-2xl font-bold text-white">Premier League Table</h1>
						<div class="mt-2 flex flex-col items-center gap-2">
							<span class="text-xs font-medium text-slate-300">2024/25 Season</span>
							{#if data.matchday}
								<div class="text-sm text-slate-400">
									Matchday <span class="font-semibold text-white">{data.matchday}</span>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Desktop Layout -->
				<div class="hidden sm:block">
					<div class="mb-3 flex items-center justify-between">
						<div>
							<h1 class="text-3xl font-bold text-white lg:text-4xl">Premier League Table</h1>
							<div class="mt-2 flex items-center gap-3">
								<span class="text-sm font-medium text-slate-300">2024/25 Season</span>
							</div>
						</div>
						<div class="flex items-center gap-4 text-base text-slate-400">
							{#if data.matchday}
								<div>
									Matchday <span class="font-semibold text-white">{data.matchday}</span>
								</div>
							{/if}
							<div class="text-sm">
								Updated: <span class="text-slate-300">{formatLastUpdated(data.lastUpdated)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Error Message -->
	{#if data.error}
		<div class="mx-auto mb-4 max-w-6xl px-4 sm:px-6">
			<div class="flex items-center gap-3 border-l-4 border-l-yellow-500 bg-slate-900 p-4">
				<RefreshCcw class="h-5 w-5 text-yellow-400" />
				<p class="text-sm text-yellow-300">{data.error}</p>
			</div>
		</div>
	{/if}

	<div class="mx-auto max-w-6xl px-4 sm:px-6">
		<!-- Standings Table -->
		<div class="overflow-hidden bg-slate-800/50">
			{#if standings.length > 0}
				<!-- Mobile Card View -->
				<div class="block sm:hidden">
					{#each standings as entry}
						<div
							class="border-b border-slate-700/50 p-4 transition-colors duration-200 last:border-b-0 hover:bg-slate-700/30"
						>
							<!-- Team Row -->
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-slate-300 {getPositionClass()}"
									>
										{entry.position}
									</div>
									{#if entry.team.crest}
										<img
											src={entry.team.crest}
											alt="{entry.team.name} crest"
											class="h-8 w-8 object-contain"
										/>
									{/if}
									<div>
										<div class="font-semibold text-white">{entry.team.shortName}</div>
									</div>
								</div>
								<div class="text-right">
									<div class="text-xl font-bold text-indigo-300">{entry.points}</div>
									<div class="text-xs text-slate-400">pts</div>
								</div>
							</div>

							<!-- Stats Row -->
							<div class="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
								<div>
									<div class="font-medium text-white">{entry.played}</div>
									<div class="text-slate-500">P</div>
								</div>
								<div>
									<div class="font-medium text-white">{entry.won}</div>
									<div class="text-slate-500">W</div>
								</div>
								<div>
									<div class="font-medium text-white">{entry.draw}</div>
									<div class="text-slate-500">D</div>
								</div>
								<div>
									<div class="font-medium text-white">{entry.lost}</div>
									<div class="text-slate-500">L</div>
								</div>
							</div>
							<!-- Goal Difference and Form -->
							<div class="mt-3 flex items-center justify-between">
								<div class="text-xs text-slate-400">
									GD:
									<span class="font-semibold text-white">
										{entry.goalDifference > 0 ? '+' : ''}{entry.goalDifference}
									</span>
								</div>
								{#if entry.form.length > 0}
									<div class="flex gap-1">
										{#each entry.form.slice(-5) as result}
											<span
												class="flex h-5 w-5 items-center justify-center rounded-sm text-[10px] font-bold {getFormClass(
													result
												)}"
											>
												{result}
											</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<!-- Desktop Table View -->
				<div class="hidden sm:block">
					<table class="min-w-full divide-y divide-slate-700/70">
						<thead class="bg-slate-900/50">
							<tr>
								<th
									class="px-4 py-3 text-left text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
								>
									#
								</th>
								<th
									class="px-4 py-3 text-left text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
								>
									Team
								</th>
								<th
									class="px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
								>
									P
								</th>
								<th
									class="px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
								>
									W
								</th>
								<th
									class="px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
								>
									D
								</th>
								<th
									class="px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
								>
									L
								</th>
								<th
									class="px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
								>
									GF
								</th>
								<th
									class="px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
								>
									GA
								</th>
								<th
									class="px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
								>
									GD
								</th>
								<th
									class="px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase"
								>
									Pts
								</th>
								<th
									class="hidden px-4 py-3 text-center text-[11px] font-bold tracking-wider whitespace-nowrap text-slate-400/80 uppercase lg:table-cell"
								>
									Form
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-700/50">
							{#each standings as entry}
								<tr class="transition-colors duration-150 hover:bg-slate-700/30">
									<!-- Position -->
									<td class="px-4 py-3 whitespace-nowrap">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-slate-300 {getPositionClass()}"
										>
											{entry.position}
										</div>
									</td>
									<!-- Team -->
									<td class="px-4 py-3 whitespace-nowrap">
										<div class="flex items-center gap-3">
											{#if entry.team.crest}
												<img
													src={entry.team.crest}
													alt="{entry.team.name} crest"
													class="h-7 w-7 object-contain"
												/>
											{/if}
											<div class="font-semibold text-white">{entry.team.name}</div>
										</div>
									</td>
									<!-- Played -->
									<td class="px-4 py-3 text-center text-sm whitespace-nowrap text-slate-300">
										{entry.played}
									</td>
									<!-- Won -->
									<td class="px-4 py-3 text-center text-sm whitespace-nowrap text-slate-300">
										{entry.won}
									</td>
									<!-- Draw -->
									<td class="px-4 py-3 text-center text-sm whitespace-nowrap text-slate-300">
										{entry.draw}
									</td>
									<!-- Lost -->
									<td class="px-4 py-3 text-center text-sm whitespace-nowrap text-slate-300">
										{entry.lost}
									</td>
									<!-- Goals For -->
									<td class="px-4 py-3 text-center text-sm whitespace-nowrap text-slate-300">
										{entry.goalsFor}
									</td>
									<!-- Goals Against -->
									<td class="px-4 py-3 text-center text-sm whitespace-nowrap text-slate-300">
										{entry.goalsAgainst}
									</td>
									<!-- Goal Difference -->
									<td class="px-4 py-3 text-center text-sm whitespace-nowrap text-slate-300">
										{entry.goalDifference > 0 ? '+' : ''}{entry.goalDifference}
									</td>
									<!-- Points -->
									<td
										class="px-4 py-3 text-center text-base font-bold whitespace-nowrap text-indigo-300"
									>
										{entry.points}
									</td>
									<!-- Form -->
									<td class="hidden px-4 py-3 whitespace-nowrap lg:table-cell">
										{#if entry.form.length > 0}
											<div class="flex justify-center gap-1">
												{#each entry.form.slice(-5) as result}
													<span
														class="flex h-6 w-6 items-center justify-center rounded-sm text-[10px] font-bold {getFormClass(
															result
														)}"
													>
														{result}
													</span>
												{/each}
											</div>
										{:else}
											<span class="text-slate-500">-</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="py-16 text-center">
					<Trophy class="mx-auto mb-4 h-12 w-12 text-slate-600" />
					<p class="text-slate-400">No standings data available</p>
				</div>
			{/if}
		</div>

		<!-- Form Legend -->
		<div class="mt-6 mb-8 flex items-center justify-center gap-4 text-xs text-slate-400">
			<span class="text-slate-500">Form:</span>
			<div class="flex items-center gap-1">
				<span
					class="flex h-5 w-5 items-center justify-center rounded-sm bg-green-600 text-[10px] font-bold text-white"
					>W</span
				>
				<span>Win</span>
			</div>
			<div class="flex items-center gap-1">
				<span
					class="flex h-5 w-5 items-center justify-center rounded-sm bg-slate-500 text-[10px] font-bold text-white"
					>D</span
				>
				<span>Draw</span>
			</div>
			<div class="flex items-center gap-1">
				<span
					class="flex h-5 w-5 items-center justify-center rounded-sm bg-red-600 text-[10px] font-bold text-white"
					>L</span
				>
				<span>Loss</span>
			</div>
		</div>
	</div>
</div>
