<script lang="ts">
	import { ChevronLeft, ChevronRight, ChevronDown } from '@lucide/svelte';

	// Props
	let { weeks, currentWeek, week, onWeekChange, onNavigate } = $props<{
		weeks: number[];
		currentWeek: number;
		week: number;
		onWeekChange: (newWeek: number) => void;
		onNavigate: (direction: 'prev' | 'next') => void;
	}>();

	// Derived state that tracks the week prop
	let selectedWeek = $derived(week);

	// Handle select change
	function handleSelectChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newWeek = parseInt(target.value, 10);
		if (!isNaN(newWeek)) {
			onWeekChange(newWeek);
		}
	}
</script>

<div class="week-selector flex items-center gap-2 sm:gap-4">
	<!-- Previous week button - Enhanced touch target -->
	<button
		class="bg-accent flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center transition-all duration-150 select-none disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10 sm:min-h-10 sm:min-w-10 active:scale-90 active:brightness-90"
		onclick={() => onNavigate('prev')}
		style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
		disabled={!weeks.includes(week - 1)}
		aria-label="Previous week"
	>
		<ChevronLeft class="text-black" size={20} />
	</button>

	<!-- Week Selector - Enhanced for touch -->
	<div class="relative">
		<select
			bind:value={selectedWeek}
			onchange={handleSelectChange}
			class="custom-select border-accent min-h-11 w-full touch-manipulation appearance-none border-2 px-4 py-2.5 text-sm font-medium text-white transition-colors focus:outline-none sm:min-h-10 sm:py-2"
		>
			{#each weeks as weekNumber}
				<option value={weekNumber} class=" text-white">
					Week {weekNumber}
				</option>
			{/each}
		</select>
		<!-- Custom dropdown indicator -->
		<div class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
			<ChevronDown class="size-4 text-slate-400" />
		</div>
	</div>
	<!-- Next week button - Enhanced touch target -->
	<button
		class="bg-accent flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center transition-all duration-150 select-none disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10 sm:min-h-10 sm:min-w-10 active:scale-90 active:brightness-90"
		onclick={() => onNavigate('next')}
		disabled={!weeks.includes(week + 1)}
		style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
		aria-label="Next week"
	>
		<ChevronRight class="text-black" size={20} />
	</button>
</div>

<style>
	.custom-select {
		/* Remove default appearance - comprehensive approach */
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		-ms-appearance: none;

		/* Remove default background image (dropdown arrow) */
		background-image: none;
		-webkit-background-image: none;
		-moz-background-image: none;
		-ms-background-image: none;

		/* Custom styling */
		background: #0d1326;
		background-color: #0d1326;
		color: white;
		font-weight: 500;
		transition: all 0.2s;
		min-width: 120px;
		padding-right: 2.5rem; /* Space for custom dropdown icon */
	}

	/* Additional browser-specific rules */
	.custom-select::-ms-expand {
		display: none; /* Remove IE/Edge dropdown arrow */
	}

	.custom-select:hover {
		background: #0d1326;
	}

	.custom-select:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px rgb(from var(--color-accent) r g b / 0.3);
	}

	/* Active state for touch feedback */
	.custom-select:active {
		transform: scale(0.98);
	}

	/* Option styling for supporting browsers */
	.custom-select option {
		background: #0d1326;
		color: white;
		padding: 0.75rem 1rem;
	}

	.custom-select option:hover,
	.custom-select option:checked {
		background: var(--color-accent);
		color: black;
	}

	/* Future-proofing: Opt into customizable select when supported */
	@supports (appearance: base-select) {
		.custom-select,
		.custom-select::picker(select) {
			appearance: base-select;
		}

		.custom-select::picker(select) {
			border: 2px solid var(--color-accent);
			background: #0d1326;
			padding: 0.25rem;
			margin-top: 0.25rem;
			box-shadow:
				0 10px 15px -3px rgb(0 0 0 / 0.1),
				0 4px 6px -4px rgb(0 0 0 / 0.1);

			/* Animation */
			opacity: 0;
			transition: all 0.2s allow-discrete;

			/* Anchor positioning */
			top: calc(anchor(bottom) + 0.25rem);
			left: anchor(left);
			min-width: anchor-size(width);
		}

		.custom-select::picker(select):popover-open {
			opacity: 1;
		}

		@starting-style {
			.custom-select::picker(select):popover-open {
				opacity: 0;
			}
		}
	}
</style>
