<script lang="ts">
	import type { PageData } from './$types';
	import { ChevronDown, ChevronUp, CheckCircle, XCircle, Target, Trophy, History } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	let openWeeks = $state(new Set<number>());
	$effect(() => {
		if (openWeeks.size === 0 && data.weekGroups[0]?.weekId != null) {
			openWeeks = new Set<number>([data.weekGroups[0].weekId]);
		}
	});

	function toggleWeek(weekId: number) {
		if (openWeeks.has(weekId)) {
			openWeeks.delete(weekId);
		} else {
			openWeeks.add(weekId);
		}
		openWeeks = new Set(openWeeks);
	}

	function outcomeFor(row: (typeof data.weekGroups)[0]['predictions'][0]) {
		if (row.status !== 'FINISHED' || row.homeScore === null || row.awayScore === null)
			return 'pending';
		if (row.predictedHome === row.homeScore && row.predictedAway === row.awayScore)
			return 'perfect';
		const predResult =
			row.predictedHome > row.predictedAway
				? 'home'
				: row.predictedHome < row.predictedAway
					? 'away'
					: 'draw';
		const actualResult =
			row.homeScore > row.awayScore ? 'home' : row.homeScore < row.awayScore ? 'away' : 'draw';
		return predResult === actualResult ? 'correct' : 'wrong';
	}

	let totalPoints = $derived(data.weekGroups.reduce((s, w) => s + w.totalPoints, 0));
	let totalCorrectScore = $derived(data.weekGroups.reduce((s, w) => s + w.correctScorelines, 0));
	let totalCorrectOutcomes = $derived(data.weekGroups.reduce((s, w) => s + w.correctOutcomes, 0));
	let avgPerWeek = $derived(
		data.weekGroups.length > 0 ? Math.round(totalPoints / data.weekGroups.length) : 0
	);
</script>

<svelte:head>
	<title>Prediction History · Master League</title>
</svelte:head>

<div class="mx-auto">
	<!-- Hero header (matches leaderboard/standings style) -->
	<div class="relative mb-6">
		<div class="font-display w-full overflow-hidden bg-slate-900">
			<div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<span
							class="bg-accent font-display mb-3 inline-block px-3 pt-2 pb-1.5 text-xs font-medium text-black sm:text-sm"
							style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
						>
							PREDICTION HISTORY
						</span>
						<h1 class="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
							Your Season So Far
						</h1>
						<p class="mt-1 text-sm text-white/50">
							{data.currentSeason} season · {data.weekGroups.length} completed gameweek{data.weekGroups.length !== 1 ? 's' : ''}
						</p>
					</div>
					<a
						href="/predictions"
						class="bg-accent hover:bg-accent/90 inline-flex items-center gap-2 self-start px-4 py-2.5 text-sm font-semibold text-black transition-colors sm:self-auto"
					>
						Current week →
					</a>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-5xl px-4 sm:px-6">
		{#if data.weekGroups.length > 0}
			<!-- Season summary cards (mirrors leaderboard stat grids) -->
			<div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div class="border-b-accent border-b-4 bg-slate-900 p-4">
					<div class="text-xs font-medium tracking-wider text-white/40 uppercase">Total pts</div>
					<div class="font-display text-accent mt-2 text-3xl font-bold">{totalPoints}</div>
				</div>
				<div class="border-b-4 border-b-yellow-400 bg-slate-900 p-4">
					<div class="text-xs font-medium tracking-wider text-white/40 uppercase">Exact scores</div>
					<div class="font-display mt-2 text-3xl font-bold text-yellow-400">{totalCorrectScore}</div>
				</div>
				<div class="border-b-4 border-b-blue-400 bg-slate-900 p-4">
					<div class="text-xs font-medium tracking-wider text-white/40 uppercase">Correct results</div>
					<div class="font-display mt-2 text-3xl font-bold text-blue-400">{totalCorrectOutcomes}</div>
				</div>
				<div class="border-b-4 border-b-slate-600 bg-slate-900 p-4">
					<div class="text-xs font-medium tracking-wider text-white/40 uppercase">Avg / week</div>
					<div class="font-display mt-2 text-3xl font-bold text-white">{avgPerWeek}</div>
				</div>
			</div>
		{/if}

		{#if data.weekGroups.length === 0}
			<div class="border border-white/10 bg-slate-900 px-6 py-20 text-center">
				<History size={48} class="mx-auto mb-4 text-white/20" />
				<p class="font-display text-xl font-semibold text-white">No history yet</p>
				<p class="mx-auto mt-2 max-w-sm text-sm text-white/40">
					Once a gameweek is finished, your completed predictions and points will appear here.
				</p>
				<a
					href="/predictions"
					class="bg-accent hover:bg-accent/90 mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-black transition-colors"
				>
					Make your predictions →
				</a>
			</div>
		{:else}
			<div class="space-y-3 pb-12">
				{#each data.weekGroups as week (week.weekId)}
					<div class="overflow-hidden bg-slate-900">
						<!-- Week header (toggle) -->
						<button
							onclick={() => toggleWeek(week.weekId)}
							class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-800/60"
						>
							<div class="flex min-w-0 items-center gap-4">
								<div class="font-display flex h-11 w-11 shrink-0 items-center justify-center bg-slate-800 text-base font-bold text-white">
									{week.weekId}
								</div>
								<div class="min-w-0">
									<div class="font-display text-base font-semibold text-white sm:text-lg">
										Gameweek {week.weekId}
									</div>
									<div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
										{#if week.correctScorelines > 0}
											<span class="inline-flex items-center gap-1">
												<CheckCircle size={11} class="text-accent" />
												{week.correctScorelines} exact
											</span>
										{/if}
										{#if week.correctOutcomes > 0}
											<span class="inline-flex items-center gap-1">
												<Target size={11} class="text-yellow-400" />
												{week.correctOutcomes} result{week.correctOutcomes !== 1 ? 's' : ''}
											</span>
										{/if}
										<span>{week.predictions.length} fixture{week.predictions.length !== 1 ? 's' : ''}</span>
									</div>
								</div>
							</div>
							<div class="flex shrink-0 items-center gap-3">
								<div class="text-right">
									<div class="font-display text-accent text-xl font-bold tabular-nums">{week.totalPoints}</div>
									<div class="text-[10px] tracking-wider text-white/40 uppercase">pts</div>
								</div>
								{#if openWeeks.has(week.weekId)}
									<ChevronUp size={18} class="text-white/30" />
								{:else}
									<ChevronDown size={18} class="text-white/30" />
								{/if}
							</div>
						</button>

						{#if openWeeks.has(week.weekId)}
							<div class="divide-y divide-slate-800 border-t border-slate-800">
								{#each week.predictions as row (row.predictionId)}
									{@const outcome = outcomeFor(row)}
									<div
										class="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3 sm:gap-4
											{outcome === 'perfect' ? 'bg-accent/5' : ''}"
									>
										<!-- Outcome indicator -->
										<div class="shrink-0">
											{#if outcome === 'perfect'}
												<div class="bg-accent/20 flex h-7 w-7 items-center justify-center rounded-full">
													<CheckCircle size={14} class="text-accent" />
												</div>
											{:else if outcome === 'correct'}
												<div class="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400/20">
													<Target size={14} class="text-yellow-400" />
												</div>
											{:else if outcome === 'wrong'}
												<div class="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15">
													<XCircle size={14} class="text-red-400" />
												</div>
											{:else}
												<div class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800">
													<Target size={14} class="text-white/30" />
												</div>
											{/if}
										</div>

										<!-- Teams + actual score -->
										<div class="min-w-0">
											<div class="flex items-center gap-2 text-sm">
												<span class="truncate font-medium text-white">{row.homeTeamName}</span>
												<span class="shrink-0 font-mono text-xs">
													{#if row.status === 'FINISHED' && row.homeScore !== null}
														<span class="bg-slate-800 px-1.5 py-0.5 font-semibold text-white">{row.homeScore}–{row.awayScore}</span>
													{:else}
														<span class="text-white/40">vs</span>
													{/if}
												</span>
												<span class="truncate font-medium text-white">{row.awayTeamName}</span>
											</div>
											<div class="mt-1 text-[11px] text-white/40">
												Predicted <span class="font-mono text-white/60">{row.predictedHome}–{row.predictedAway}</span>
												{#if row.pointsMultiplier > 1}
													<span class="ml-1.5 bg-yellow-400/20 px-1.5 py-0.5 font-bold text-yellow-300">{row.pointsMultiplier}×</span>
												{/if}
											</div>
										</div>

										<!-- Points earned -->
										<div class="shrink-0 text-right">
											{#if outcome === 'pending'}
												<span class="text-xs text-white/30">—</span>
											{:else}
												<div
													class="font-display text-base font-bold tabular-nums {outcome === 'perfect'
														? 'text-accent'
														: outcome === 'correct'
															? 'text-yellow-400'
															: 'text-red-400'}"
												>
													{outcome === 'wrong' ? 0 : row.points}
												</div>
												<div class="text-[10px] tracking-wider text-white/40 uppercase">pts</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
