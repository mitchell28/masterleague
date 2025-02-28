<script lang="ts">
	import { fade } from 'svelte/transition';

	// Component props
	export let errors: Record<string, string> = {};
	export let field: string | null = null;

	// If field is provided, only show errors for that field
	// Otherwise show all errors
	$: visibleErrors = field ? (errors[field] ? { [field]: errors[field] } : {}) : errors;

	// Count the number of errors
	$: errorCount = Object.keys(visibleErrors).length;
</script>

{#if errorCount > 0}
	<div class="validation-errors mt-1" transition:fade={{ duration: 150 }}>
		{#if field}
			<!-- Single field error -->
			<small class="text-error-500">{visibleErrors[field]}</small>
		{:else}
			<!-- Multiple errors list -->
			<ul class="mt-2 list-disc space-y-1 pl-5">
				{#each Object.entries(visibleErrors) as [key, message]}
					<li class="text-error-500 text-sm">{message}</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style>
	.validation-errors {
		animation: shake 0.5s ease-in-out;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20%,
		60% {
			transform: translateX(-5px);
		}
		40%,
		80% {
			transform: translateX(5px);
		}
	}
</style>
