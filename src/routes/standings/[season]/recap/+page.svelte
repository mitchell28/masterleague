<script lang="ts">
	import type { PageData } from './$types';
	import { Trophy, Target, Zap, Star, Users, Crown } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	let { season, orgName, standings, awards } = $derived(data);

	const AWARD_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];
	const AWARD_BG = ['bg-yellow-400', 'bg-slate-400', 'bg-amber-600'];

	let displaySeason = $derived(season.replace('-', '/'));
</script>

<svelte:head>
	<title>{season} Season Recap · Master League</title>
</svelte:head>

<div class="mx-auto">
	<!-- Hero header with podium feature -->
	<div class="relative mb-6 overflow-hidden">
		<!-- Background accents -->
		<div class="pointer-events-none absolute inset-0">
			<div class="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-400/5 blur-3xl"></div>
		</div>
		<div class="font-display relative w-full bg-slate-900">
			<div class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
				<div class="text-center">
					<span
						class="bg-accent font-display mb-4 inline-block px-3 pt-2 pb-1.5 text-xs font-medium text-black"
						style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
					>
						SEASON RECAP
					</span>
					<h1 class="text-5xl font-black text-white sm:text-6xl lg:text-7xl">{displaySeason}</h1>
					<p class="mt-3 text-sm text-white/40 sm:text-base">{orgName}</p>
				</div>

				<!-- Champion spotlight -->
				{#if awards.champion}
					<div class="mx-auto mt-10 max-w-md">
						<div class="relative">
							<div class="absolute inset-0 bg-yellow-400/10 blur-2xl"></div>
							<div class="relative border-b-4 border-b-yellow-400 bg-slate-950/60 p-6 text-center">
								<Crown class="mx-auto mb-3 text-yellow-400" size={36} />
								<div class="text-xs font-semibold tracking-widest text-yellow-400 uppercase">Champion</div>
								<div class="font-display mt-2 text-3xl font-black text-white">{awards.champion.userName ?? 'Unknown'}</div>
								<div class="text-accent font-display mt-2 text-2xl font-bold">{awards.champion.totalPoints} <span class="text-sm font-medium text-white/40">pts</span></div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
		<!-- Award cards (excludes champion which has its spotlight above) -->
		<h2 class="font-display mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider text-white/40 uppercase">
			<Star size={14} /> Season Awards
		</h2>
		<div class="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
			{#if awards.mostAccurate}
				<div class="border-b-4 border-b-purple-400 bg-slate-900 p-5">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold tracking-wider text-purple-400 uppercase">Sharpshooter</span>
						<Target class="text-purple-400" size={20} />
					</div>
					<div class="font-display mt-3 text-xl font-bold text-white">{awards.mostAccurate.userName ?? 'Unknown'}</div>
					<div class="mt-1 text-sm text-white/50">{awards.mostAccurate.correctScorelines} exact scores</div>
				</div>
			{/if}

			{#if awards.bestWeek}
				<div class="border-b-4 border-b-blue-400 bg-slate-900 p-5">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold tracking-wider text-blue-400 uppercase">Best week</span>
						<Zap class="text-blue-400" size={20} />
					</div>
					<div class="font-display mt-3 text-xl font-bold text-white">{awards.bestWeek.userName ?? 'Unknown'}</div>
					<div class="mt-1 text-sm text-white/50">GW{awards.bestWeek.weekId} · <span class="text-accent font-semibold">{awards.bestWeek.weekPoints} pts</span></div>
				</div>
			{/if}

			{#if awards.mostActive}
				<div class="border-b-accent border-b-4 bg-slate-900 p-5">
					<div class="flex items-center justify-between">
						<span class="text-accent text-xs font-semibold tracking-wider uppercase">Most active</span>
						<Star class="text-accent" size={20} />
					</div>
					<div class="font-display mt-3 text-xl font-bold text-white">{awards.mostActive.userName ?? 'Unknown'}</div>
					<div class="mt-1 text-sm text-white/50">{awards.mostActive.predictedFixtures} predictions</div>
				</div>
			{/if}
		</div>

		<!-- Final standings -->
		<h2 class="font-display mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider text-white/40 uppercase">
			<Users size={14} /> Final Standings
		</h2>
		<div class="overflow-hidden bg-slate-900">
			<!-- Mobile cards -->
			<div class="block divide-y divide-slate-800 sm:hidden">
				{#each standings as player, i (player.userId)}
					<div class="flex items-center gap-3 px-4 py-3 {i < 3 ? 'bg-slate-800/30' : ''}">
						<div class="font-display flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold {i < 3 ? AWARD_BG[i] + ' text-black' : 'bg-slate-800 text-white/50'}">
							{i + 1}
						</div>
						<div class="min-w-0 flex-1">
							<div class="truncate font-semibold text-white">{player.userName ?? 'Unknown'}</div>
							<div class="text-xs text-white/40">{player.correctScorelines ?? 0} exact · {player.predictedFixtures ?? 0} predictions</div>
						</div>
						<div class="font-display text-accent shrink-0 text-lg font-bold tabular-nums">{player.totalPoints}</div>
					</div>
				{/each}
			</div>
			<!-- Desktop table -->
			<table class="hidden w-full text-sm sm:table">
				<thead>
					<tr class="border-b border-slate-800 bg-slate-950/40 text-left text-xs font-medium tracking-wider text-white/40 uppercase">
						<th class="px-5 py-3">#</th>
						<th class="px-5 py-3">Player</th>
						<th class="px-5 py-3 text-right">Pts</th>
						<th class="px-5 py-3 text-right">Exact</th>
						<th class="px-5 py-3 text-right">Predicted</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-800">
					{#each standings as player, i (player.userId)}
					<tr class="transition-colors hover:bg-slate-800/40 {i < 3 ? 'bg-slate-800/20' : ''}">
							<td class="px-5 py-3">
								<div class="font-display flex h-8 w-8 items-center justify-center text-sm font-bold {i < 3 ? AWARD_BG[i] + ' text-black' : 'bg-slate-800 text-white/50'}">
									{i + 1}
								</div>
							</td>
							<td class="px-5 py-3 font-medium text-white">
								<span class="flex items-center gap-2">
									{player.userName ?? 'Unknown'}
									{#if i === 0}<Crown size={14} class="text-yellow-400" />{/if}
								</span>
							</td>
							<td class="font-display text-accent px-5 py-3 text-right text-base font-bold tabular-nums">{player.totalPoints}</td>
							<td class="px-5 py-3 text-right text-white/60 tabular-nums">{player.correctScorelines ?? 0}</td>
							<td class="px-5 py-3 text-right text-white/60 tabular-nums">{player.predictedFixtures ?? 0}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
