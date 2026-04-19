<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		text,
		side = 'top',
		children
	}: {
		text: string;
		side?: 'top' | 'bottom' | 'left' | 'right';
		children: Snippet;
	} = $props();

	let visible = $state(false);
	let triggerEl = $state<HTMLSpanElement | null>(null);
	let coords = $state({ top: 0, left: 0 });
	let showTimer: ReturnType<typeof setTimeout> | null = null;

	function compute() {
		if (!triggerEl) return;
		const rect = triggerEl.getBoundingClientRect();
		const gap = 8;
		let top = 0;
		let left = 0;
		switch (side) {
			case 'top':
				top = rect.top - gap;
				left = rect.left + rect.width / 2;
				break;
			case 'bottom':
				top = rect.bottom + gap;
				left = rect.left + rect.width / 2;
				break;
			case 'left':
				top = rect.top + rect.height / 2;
				left = rect.left - gap;
				break;
			case 'right':
				top = rect.top + rect.height / 2;
				left = rect.right + gap;
				break;
		}
		coords = { top, left };
	}

	function show() {
		if (showTimer) clearTimeout(showTimer);
		showTimer = setTimeout(() => {
			compute();
			visible = true;
		}, 120);
	}

	function hide() {
		if (showTimer) {
			clearTimeout(showTimer);
			showTimer = null;
		}
		visible = false;
	}

	let translate = $derived(
		side === 'top'
			? 'translate(-50%, -100%)'
			: side === 'bottom'
				? 'translate(-50%, 0)'
				: side === 'left'
					? 'translate(-100%, -50%)'
					: 'translate(0, -50%)'
	);
</script>

<span
	bind:this={triggerEl}
	role="presentation"
	class="inline-flex"
	onmouseenter={show}
	onmouseleave={hide}
	onfocusin={show}
	onfocusout={hide}
>
	{@render children()}
</span>

{#if visible && text}
	<div
		role="tooltip"
		class="pointer-events-none fixed z-100 max-w-xs rounded-md bg-slate-950/95 px-2.5 py-1.5 text-xs leading-snug text-slate-100 shadow-lg ring-1 ring-slate-700"
		style="top: {coords.top}px; left: {coords.left}px; transform: {translate};"
	>
		{text}
	</div>
{/if}
