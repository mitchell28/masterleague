<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { open = $bindable(false), children } = $props();

	function close() {
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			close();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<button
		type="button"
		class="fixed inset-0 z-10000 bg-black/80 backdrop-blur-[1px] transition-all"
		transition:fade={{ duration: 200 }}
		onclick={close}
		aria-label="Close drawer"
	></button>

	<!-- Drawer Content -->
	<div
		class="fixed bottom-0 left-0 right-0 z-10001 flex max-h-[85vh] flex-col rounded-t-[20px] border-t border-accent/30 bg-[#0D1326] shadow-2xl outline-none"
		transition:fly={{ y: '100%', duration: 300, opacity: 1, easing: cubicOut }}
		role="dialog"
		aria-modal="true"
	>
		<!-- Handle -->
		<div class="flex w-full justify-center pt-4 pb-2" onclick={close} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && close()}>
			<div class="h-1.5 w-12 rounded-full bg-slate-700/50"></div>
		</div>

		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-4 pb-8">
			{@render children()}
		</div>
	</div>
{/if}
