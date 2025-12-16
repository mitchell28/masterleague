<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Check, AlertTriangle, RefreshCw } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { Team, Prediction } from '$lib/server/db/schema';
	import type { Fixture as BaseFixture } from '$lib/server/db/schema';
	import PredictionCardV2 from '../components/PredictionCardV2.svelte';
	import { usePredictions } from '../hooks/usePredictions.svelte.js';

	// Extended Fixture type with canPredict property
	type Fixture = BaseFixture & {
		canPredict?: boolean;
		isPastWeek?: boolean;
		isLive?: boolean;
	};

	// Type for our page data to ensure it matches server return type
	interface PredictionsPageData {
		fixtures: Fixture[];
		teams: Record<string, Team>;
		predictions: Record<string, Prediction & { home: number; away: number }>;
		isPastWeek: boolean;
		lastUpdated: string;
		currentWeek: number;
		week: number;
	}

	// Using runes for page data
	let { data, form } = $props<{
		data: PredictionsPageData;
		form?: {
			success: boolean;
			message?: string;
			fixtures?: Fixture[];
			updated?: number;
			live?: number;
			rateLimited?: boolean;
		};
	}>();

	// svelte-ignore state_referenced_locally
	const initialData = data;
	// svelte-ignore state_referenced_locally
	const initialForm = form;

	// Initialize the predictions hook with all functionality
	const {
		state: predictionsState,
		derived: predictionsInfo,
		updatePrediction,
		updateComponentData: updatePredictionsData,
		handleSubmit,
		isPredictionInvalid,
		canSubmitForm,
		manualRefresh
	} = usePredictions(initialData, initialForm);

	// Track current displayed week for comparison
	let currentDisplayedWeek = $derived(data.week);

	// Effect to handle week changes
	$effect(() => {
		if (data && data.week !== currentDisplayedWeek) {
			currentDisplayedWeek = data.week;
			updatePredictionsData(data);
		}
	});

	// Effect to show toast notifications for form results
	$effect(() => {
		if (form?.success) {
			toast.success('Predictions saved successfully!', {
				duration: 3000
			});
		} else if (form && !form.success && form.message) {
			toast.error(form.message, {
				duration: 4000
			});
		}
	});

	// Effect to show toast for rate limiting
	$effect(() => {
		if (form?.rateLimited) {
			toast.warning('Football API rate limit reached. Using cached data.', {
				duration: 5000
			});
		}
	});

	// Effect to handle success/error states from predictions hook
	$effect(() => {
		if (predictionsState.showSuccess) {
			toast.success('Predictions saved successfully!', {
				duration: 3000
			});
		}
	});

	$effect(() => {
		if (predictionsState.showError && predictionsState.errorMessage) {
			toast.error(predictionsState.errorMessage, {
				duration: 4000
			});
		}
	});

	// Auto-check for past week updates (not just on reload)
	let pastWeekCheckTimer: number | null = null;

	$effect(() => {
		// Clear existing timer
		if (pastWeekCheckTimer) {
			clearTimeout(pastWeekCheckTimer);
		}

		// Only check past weeks automatically
		if (predictionsInfo.isPastWeek) {
			// Check immediately, then every 2 minutes for past week updates
			const checkForUpdates = async () => {
				try {
					const response = await fetch(`?/checkPastWeekUpdates`, {
						method: 'POST',
						body: new FormData()
					});

					if (response.ok) {
						const result = await response.json();
						if (result.hasUpdates) {
							toast.info('New scores available for this week', {
								duration: 4000,
								action: {
									label: 'Refresh',
									onClick: () => window.location.reload()
								}
							});
						}
					}
				} catch (error) {
					// Silently fail - don't spam user with errors
					console.log('Past week check failed:', error);
				}
			};

			// Check immediately
			checkForUpdates();

			// Then check every 2 minutes
			pastWeekCheckTimer = setInterval(checkForUpdates, 120000) as any;
		}

		// Cleanup function
		return () => {
			if (pastWeekCheckTimer) {
				clearTimeout(pastWeekCheckTimer);
				pastWeekCheckTimer = null;
			}
		};
	});
</script>

<!-- Live matches indicator with clean design -->
{#if predictionsInfo.hasLiveFixtures && predictionsInfo.isCurrentWeek}
	<div class="relative mb-6">
		<div
			class="relative h-[90px] w-full overflow-hidden border-b-4 border-red-500 bg-gradient-to-r from-red-900/50 to-red-700/30"
		>
			<!-- Red top bar -->
			<div class="flex h-[18px] w-full items-center justify-center bg-red-500">
				<span class="text-xs font-bold text-white">LIVE MATCHES</span>
			</div>

			<!-- Content -->
			<div class="relative flex h-full items-center justify-between px-6 pt-3 pb-4">
				<div class="flex items-center gap-3">
					<span class="relative flex h-4 w-4">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"
						></span>
						<span class="relative inline-flex h-4 w-4 rounded-full bg-red-600"></span>
					</span>
					<div class="flex flex-col">
						<span class="font-semibold text-red-100">Auto-updating scores</span>
						{#if predictionsState.isPolling}
							<span class="text-xs text-red-200">
								Last update: {new Date(predictionsState.lastPollTime).toLocaleTimeString()}
							</span>
						{/if}
					</div>
				</div>
				<button
					onclick={manualRefresh}
					class="flex items-center gap-2 rounded bg-red-800/50 px-3 py-2 text-xs text-red-100 hover:bg-red-800"
					disabled={predictionsState.isUpdating}
					title="Refresh scores now"
				>
					<RefreshCw size={14} class={predictionsState.isUpdating ? 'animate-spin' : ''} />
					<span>Refresh</span>
				</button>
			</div>
		</div>
	</div>
{/if}

{#if !predictionsState.fixtures?.length}
	<div class="relative mb-6">
		<div
			class="relative h-[120px] w-full overflow-hidden border-b-6 border-slate-500 bg-slate-800/50"
		>
			<!-- No fixtures top bar -->
			<div class="flex h-[20px] w-full items-center justify-center bg-slate-500">
				<span class="font-bold text-black">NO FIXTURES</span>
			</div>

			<!-- Content -->
			<div class="relative flex h-full items-center justify-center px-6 pt-4 pb-4">
				<p class="text-center text-lg text-white">
					No fixtures found for Week {predictionsInfo.weekParam}.
				</p>
			</div>
		</div>
	</div>
{:else}
	<!-- Main predictions form -->
	<div class="my-8 w-full">
		<form method="POST" action="?/submitPredictions" use:enhance={handleSubmit} class="space-y-6">
			<input type="hidden" name="week" value={predictionsInfo.weekParam} />

			<!-- Grid to display match predictions - with optimized keyed each -->
			<div class="grid grid-cols-1 items-center justify-center gap-8 lg:grid-cols-2">
				{#each predictionsState.fixtures as fixture (fixture.id)}
					<PredictionCardV2
						{fixture}
						homeTeam={predictionsInfo.teams[fixture.homeTeamId]}
						awayTeam={predictionsInfo.teams[fixture.awayTeamId]}
						prediction={predictionsState.predictionValues[fixture.id] ?? undefined}
						isInvalid={isPredictionInvalid(fixture.id)}
						onUpdate={(home, away) => updatePrediction(fixture.id, home, away)}
						readOnly={!fixture.canPredict}
						isPastWeek={predictionsInfo.isPastWeek}
					/>

					<!-- Hidden input fields to ensure data is submitted (only for predictable fixtures) -->
					{#if fixture.canPredict && predictionsState.predictionValues[fixture.id] !== null}
						<input
							type="hidden"
							name="prediction-{fixture.id}-home"
							value={predictionsState.predictionValues[fixture.id]?.home || 0}
						/>
						<input
							type="hidden"
							name="prediction-{fixture.id}-away"
							value={predictionsState.predictionValues[fixture.id]?.away || 0}
						/>
					{/if}
				{/each}
			</div>

			<!-- Submit button - only shown for current or future weeks -->
			{#if !predictionsInfo.isPastWeek}
				<div class="mt-8 flex justify-end">
					<button
						type="submit"
						class="bg-accent hover:bg-accent/80 font-display px-8 py-3 font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
						disabled={predictionsState.submitting || !canSubmitForm()}
					>
						{predictionsState.submitting ? 'SAVING...' : 'SAVE PREDICTIONS'}
					</button>
				</div>
			{:else}
				<div class="relative mt-8">
					<div
						class="relative h-[60px] w-full overflow-hidden border-b-2 border-slate-400 bg-slate-800/30"
					>
						<!-- Past week top bar -->
						<div class="flex h-[12px] w-full items-center justify-center bg-slate-400">
							<span class="text-xs font-bold text-black">PAST WEEK</span>
						</div>

						<!-- Content -->
						<div class="relative flex h-full items-center justify-center px-6 pt-2 pb-4">
							<span class="text-sm text-slate-400 italic">
								Viewing past predictions - no changes allowed
							</span>
						</div>
					</div>
				</div>
			{/if}
		</form>
	</div>
{/if}
