<script lang="ts">
	import { Trophy, Calendar, Clock, ChevronRight, Star } from '@lucide/svelte';

	interface PodiumEntry {
		name: string;
		totalPoints: number;
		position: number;
	}

	let {
		currentSeason,
		previousSeason,
		nextSeasonStart,
		daysUntilStart,
		previousSeasonPodium = []
	}: {
		currentSeason: string;
		previousSeason: string;
		nextSeasonStart: string; // ISO string
		daysUntilStart: number;
		previousSeasonPodium?: PodiumEntry[];
	} = $props();

	// Client-side countdown (days / hours / mins) refreshed every minute
	let countdown = $state({ days: daysUntilStart, hours: 0, minutes: 0 });

	function computeCountdown() {
		const now = new Date();
		const target = new Date(nextSeasonStart);
		const diff = target.getTime() - now.getTime();
		if (diff <= 0) {
			countdown = { days: 0, hours: 0, minutes: 0 };
			return;
		}
		const totalMinutes = Math.floor(diff / 60000);
		countdown = {
			days: Math.floor(totalMinutes / 1440),
			hours: Math.floor((totalMinutes % 1440) / 60),
			minutes: totalMinutes % 60
		};
	}

	$effect(() => {
		computeCountdown();
		const interval = setInterval(computeCountdown, 60000);
		return () => clearInterval(interval);
	});

	const podiumOrder = $derived(
		[...previousSeasonPodium].sort((a, b) => {
			// Render order: 2nd, 1st, 3rd for visual podium
			const order: Record<number, number> = { 1: 1, 2: 0, 3: 2 };
			return (order[a.position] ?? a.position) - (order[b.position] ?? b.position);
		})
	);

	const displaySeason = $derived(currentSeason.replace('-', '/'));
	const displayPrevSeason = $derived(previousSeason.replace('-', '/'));

	// Format kick-off date nicely
	const kickoffLabel = $derived(
		new Date(nextSeasonStart).toLocaleDateString('en-GB', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
	);

	const positionLabels: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };
	const positionColors: Record<number, string> = {
		1: 'text-yellow-400',
		2: 'text-slate-300',
		3: 'text-amber-600'
	};
	const positionSizes: Record<number, string> = {
		1: 'scale-110 -translate-y-2',
		2: 'scale-100',
		3: 'scale-100'
	};
</script>

<style>
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(24px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes pulse-glow {
		0%,
		100% {
			box-shadow: 0 0 0 0 oklch(88.266% 0.20737 155.248 / 0.4);
		}
		50% {
			box-shadow: 0 0 0 12px oklch(88.266% 0.20737 155.248 / 0);
		}
	}

	.anim-1 {
		animation: fadeInUp 0.5s ease-out 0s both;
	}
	.anim-2 {
		animation: fadeInUp 0.5s ease-out 0.1s both;
	}
	.anim-3 {
		animation: fadeInUp 0.5s ease-out 0.2s both;
	}
	.anim-4 {
		animation: fadeInUp 0.5s ease-out 0.3s both;
	}
	.anim-5 {
		animation: fadeInUp 0.5s ease-out 0.4s both;
	}

	.dot-pulse {
		animation: pulse-glow 2s ease-in-out infinite;
	}
</style>

<div class="relative min-h-[70vh] overflow-hidden px-4 py-12">
	<!-- Pitch background lines -->
	<div class="pointer-events-none absolute inset-0">
		<div
			class="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 md:h-120 md:w-120"
		></div>
		<div
			class="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10"
		></div>
		<div
			class="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-linear-to-r from-transparent via-white/5 to-transparent"
		></div>
	</div>

	<div class="relative z-10 mx-auto max-w-3xl space-y-10 text-center">
		<!-- Badge -->
		<div class="anim-1 flex justify-center">
			<div class="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-2">
				<span class="relative flex h-2 w-2">
					<span class="bg-accent dot-pulse absolute inline-flex h-full w-full rounded-full"></span>
					<span class="bg-accent relative inline-flex h-2 w-2 rounded-full"></span>
				</span>
				<span class="text-xs font-medium tracking-widest text-white/60 uppercase"
					>Off Season</span
				>
			</div>
		</div>

		<!-- Heading -->
		<div class="anim-2 space-y-3">
			<h1 class="font-display text-5xl font-black text-white md:text-7xl">
				See You In <span class="text-accent">{displaySeason}</span>
			</h1>
			<p class="text-lg text-white/50">
				The {displayPrevSeason} season has wrapped. The next battle begins soon.
			</p>
		</div>

		<!-- Countdown -->
		<div class="anim-3">
			<div
				class="mx-auto inline-grid max-w-sm grid-cols-3 gap-3 border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
			>
				{#each [{ label: 'Days', value: countdown.days }, { label: 'Hours', value: countdown.hours }, { label: 'Minutes', value: countdown.minutes }] as unit}
					<div class="flex flex-col items-center gap-1">
						<span class="font-display text-4xl font-black text-white tabular-nums"
							>{String(unit.value).padStart(2, '0')}</span
						>
						<span class="text-xs font-medium tracking-widest text-white/40 uppercase"
							>{unit.label}</span
						>
					</div>
				{/each}
			</div>
			<p class="mt-3 flex items-center justify-center gap-1.5 text-sm text-white/40">
				<Calendar class="h-4 w-4" />
				Kick-off: {kickoffLabel}
			</p>
		</div>

		<!-- Previous season podium -->
		{#if previousSeasonPodium.length > 0}
			<div class="anim-4 space-y-4">
				<div class="flex items-center justify-center gap-2 text-sm text-white/40">
					<Trophy class="h-4 w-4" />
					<span class="font-medium tracking-widest uppercase"
						>{displayPrevSeason} Final Standings</span
					>
				</div>

				<div class="flex items-end justify-center gap-3">
					{#each podiumOrder as entry}
						<div
							class="flex flex-col items-center gap-2 {positionSizes[entry.position] ??
								'scale-100'} transition-transform"
						>
							<!-- Medal -->
							<span class="text-2xl">
								{entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : '🥉'}
							</span>

							<!-- Card -->
							<div
								class="min-w-22.5 border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
							>
								<p class="font-display text-lg font-black text-white">{entry.name}</p>
								<p class="font-display text-2xl font-black {positionColors[entry.position] ?? 'text-white'}"
									>{entry.totalPoints}</p
								>
								<p class="text-xs text-white/30">pts</p>
							</div>

							<!-- Position label -->
							<span class="text-xs font-medium text-white/40"
								>{positionLabels[entry.position] ?? `${entry.position}th`}</span
							>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- CTA links -->
		<div class="anim-5 flex flex-wrap items-center justify-center gap-3">
			<a
				href="/standings/{previousSeason}/recap"
				class="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
			>
				<Trophy class="h-4 w-4" />
				View {displayPrevSeason} Standings
			</a>
			<a
				href="/hall-of-fame"
				class="bg-accent inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
			>
				<Star class="h-4 w-4" />
				Hall of Fame
				<ChevronRight class="h-4 w-4" />
			</a>
		</div>
	</div>
</div>
