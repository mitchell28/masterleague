<script lang="ts">
	import { renderStudio, type StudioProps } from 'sanity';
	import { browser } from '$app/environment';

	let { config } = $props<{ config: StudioProps['config'] }>();

	let studioEl: HTMLDivElement;

	$effect(() => {
		if (browser && studioEl) {
			renderStudio(studioEl, config);
		}
	});
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
	<meta name="robots" content="noindex" />
	<meta name="referrer" content="same-origin" />
</svelte:head>

<div id="svelte-studio">
	<div bind:this={studioEl}></div>
</div>

<style>
	#svelte-studio {
		height: 100vh;
	}

	#svelte-studio > div {
		height: 100%;
	}
</style>
