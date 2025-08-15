<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import Navbar from '$lib/components/Navbar.svelte';
	import { page } from '$app/state';
	import { MetaTags, deepMerge } from 'svelte-meta-tags';

	// Component props
	let { children, data } = $props();

	let metaTags = $derived(deepMerge(data.baseMetaTags, page.data.pageMetaTags));
</script>

<MetaTags {...metaTags} />
<Navbar />
<main class="min-h-screen">
	{@render children()}
</main>
