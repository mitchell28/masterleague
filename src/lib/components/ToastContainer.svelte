<script lang="ts">
	import Toast from './Toast.svelte';
	import { toastStore } from '$lib/stores/toastStore';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
</script>

<div class="toast-container fixed top-4 right-4 z-50 flex flex-col gap-2">
	{#each $toastStore as toast (toast.id)}
		<div animate:flip={{ duration: 300 }} transition:fade={{ duration: 200 }}>
			<Toast
				type={toast.type}
				message={toast.message}
				duration={toast.duration || 5000}
				showClose={toast.showClose !== false}
				on:close={() => toastStore.remove(toast.id)}
			/>
		</div>
	{/each}
</div>
