<script lang="ts">
	import { Trophy } from '@lucide/svelte';

	type LeaderboardEntry = {
		userId: string;
		username: string;
		score: number;
		weeklyPoints?: number;
		correctScorelines?: number;
	};

	let { topThree, currentWeek }: { topThree: LeaderboardEntry[]; currentWeek: number } = $props();

	const podiumColors = [
		{ bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
		{ bg: 'bg-slate-400/20', border: 'border-slate-400/50', text: 'text-slate-300', glow: 'shadow-slate-400/20' },
		{ bg: 'bg-amber-600/20', border: 'border-amber-600/50', text: 'text-amber-500', glow: 'shadow-amber-500/20' }
	];

	const podiumHeights = ['h-32 sm:h-40', 'h-24 sm:h-32', 'h-20 sm:h-28'];
	const positions = [1, 0, 2]; // Display order: 2nd, 1st, 3rd
</script>

{#if topThree && topThree.length >= 3}
	<div class="mb-6 sm:mb-8">
		<!-- Podium Container -->
		<div class="flex items-end justify-center gap-2 sm:gap-4 px-4">
			{#each positions as pos, displayIndex}
				{@const entry = topThree[pos]}
				{@const colors = podiumColors[pos]}
				{@const height = podiumHeights[pos]}
				<a
					href={`/leaderboard/${entry.userId}/${currentWeek}`}
					class="group flex flex-col items-center transition-transform duration-300 hover:scale-105"
				>
					<!-- Player Info Card -->
					<div 
						class="mb-2 flex flex-col items-center rounded-lg border {colors.border} {colors.bg} p-2 sm:p-3 backdrop-blur-sm transition-all duration-300 group-hover:shadow-lg {colors.glow}"
						style="clip-path: polygon(8% 0%, 100% 0%, 100% 85%, 92% 100%, 0% 100%, 0% 15%);"
					>
						<!-- Trophy/Medal -->
						<div class="mb-1 {colors.text}">
							{#if pos === 0}
								<Trophy class="h-5 w-5 sm:h-6 sm:w-6" />
							{:else}
								<span class="text-lg sm:text-xl font-bold">{pos + 1}</span>
							{/if}
						</div>
						
						<!-- Avatar -->
						<div 
							class="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 {colors.border} bg-slate-800 text-sm sm:text-base font-bold {colors.text}"
						>
							{entry.username?.charAt(0).toUpperCase() || '?'}
						</div>
						
						<!-- Name -->
						<p class="mt-1 max-w-[70px] sm:max-w-[90px] truncate text-xs sm:text-sm font-medium text-white">
							{entry.username || 'Anonymous'}
						</p>
						
						<!-- Score -->
						<p class="text-base sm:text-lg font-bold {colors.text}">
							{entry.score || 0}
						</p>
						<p class="text-[10px] sm:text-xs text-slate-400">points</p>
					</div>
					
					<!-- Podium Stand -->
					<div 
						class="{height} w-20 sm:w-28 {colors.bg} border-t-2 {colors.border} flex items-start justify-center pt-2 transition-all duration-300"
						style="clip-path: polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%);"
					>
						<span class="text-2xl sm:text-4xl font-black {colors.text} opacity-30">
							{pos + 1}
						</span>
					</div>
				</a>
			{/each}
		</div>
	</div>
{/if}
