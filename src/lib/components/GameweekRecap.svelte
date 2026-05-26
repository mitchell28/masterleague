<script lang="ts">
	import { onMount } from 'svelte';
	import { Trophy, X, ChevronRight } from '@lucide/svelte';

	let { previousWeek }: { previousWeek: number } = $props();

	interface RecapData {
		available: boolean;
		weekId?: number;
		totalPoints?: number;
		totalPredictions?: number;
		correctScorelines?: number;
		correctOutcomes?: number;
	}

	let recap = $state<RecapData | null>(null);
	let dismissed = $state(false);

	const DISMISS_KEY = `recap-dismissed-gw`;

	onMount(async () => {
		if (previousWeek < 1) return;

		// Check if already dismissed for this week
		const dismissed_key = `${DISMISS_KEY}-${previousWeek}`;
		if (typeof localStorage !== 'undefined' && localStorage.getItem(dismissed_key)) return;

		try {
			const res = await fetch(`/api/predictions/week-recap?week=${previousWeek}`);
			if (!res.ok) return;
			const data: RecapData = await res.json();
			if (data.available) recap = data;
		} catch {
			// Silently fail — recap is a non-critical enhancement
		}
	});

	function dismiss() {
		dismissed = true;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(`${DISMISS_KEY}-${previousWeek}`, '1');
		}
	}
</script>

{#if recap && !dismissed}
	<div class="border-accent/20 bg-accent/5 relative flex items-center gap-3 border-b px-4 py-3 sm:px-6">
		<Trophy class="text-accent shrink-0" size={18} />
		<div class="min-w-0 flex-1">
			<span class="text-sm font-medium text-white">
				GW{recap.weekId} recap:
			</span>
			<span class="text-accent ml-1 text-sm font-bold">{recap.totalPoints} pts</span>
			{#if (recap.correctScorelines ?? 0) > 0}
				<span class="ml-2 text-xs text-white/50">
					{recap.correctScorelines} exact {recap.correctScorelines === 1 ? 'score' : 'scores'}
				</span>
			{/if}
			{#if (recap.correctOutcomes ?? 0) > 0}
				<span class="ml-1 text-xs text-white/50">
					· {recap.correctOutcomes} correct {recap.correctOutcomes === 1 ? 'outcome' : 'outcomes'}
				</span>
			{/if}
		</div>
		<a
			href="/predictions/history"
			class="text-accent/70 hover:text-accent hidden shrink-0 items-center gap-1 text-xs transition-colors sm:flex"
		>
			View history <ChevronRight size={12} />
		</a>
		<button
			onclick={dismiss}
			class="shrink-0 text-white/30 transition-colors hover:text-white/60"
			aria-label="Dismiss"
		>
			<X size={16} />
		</button>
	</div>
{/if}
