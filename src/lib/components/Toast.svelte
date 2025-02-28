<script context="module" lang="ts">
	// Types of toast
	export type ToastType = 'success' | 'error' | 'warning' | 'info';
</script>

<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';

	// Component props
	export let type: ToastType = 'info';
	export let message: string;
	export let duration: number = 5000; // 5 seconds default
	export let showClose: boolean = true;

	// Event dispatcher for close
	const dispatch = createEventDispatcher<{ close: void }>();

	// Auto-hide timer
	let timer: ReturnType<typeof setTimeout>;

	// CSS classes based on type
	const typeClasses = {
		success: 'bg-success-500 text-white',
		error: 'bg-error-500 text-white',
		warning: 'bg-warning-500 text-white',
		info: 'bg-primary-500 text-white'
	};

	// Icon based on type
	const icons = {
		success: '✓',
		error: '✗',
		warning: '⚠',
		info: 'ℹ'
	};

	function close() {
		clearTimeout(timer);
		dispatch('close');
	}

	// Start timer when component mounts
	onMount(() => {
		if (duration > 0) {
			timer = setTimeout(close, duration);
		}
	});

	onDestroy(() => {
		clearTimeout(timer);
	});
</script>

<div
	class="toast-container fixed top-4 right-4 z-50"
	in:fly={{ x: 20, duration: 300 }}
	out:fade={{ duration: 200 }}
>
	<div class="toast flex items-center rounded p-4 shadow-lg {typeClasses[type]}" role="alert">
		<span class="mr-2 text-lg">{icons[type]}</span>
		<div class="ml-2">{message}</div>
		{#if showClose}
			<button
				class="ml-4 opacity-70 transition-opacity hover:opacity-100 focus:opacity-100"
				on:click={close}
				aria-label="Close toast"
			>
				×
			</button>
		{/if}
	</div>
</div>

<style>
	.toast {
		min-width: 300px;
		max-width: 600px;
	}
</style>
