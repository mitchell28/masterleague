<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import { page } from '$app/state';
	import { MetaTags, deepMerge } from 'svelte-meta-tags';
	import { Toaster } from 'svelte-sonner';
	import Snowfall from '$lib/components/christmas/Snowfall.svelte';

	// Component props
	let { children, data } = $props();

	let metaTags = $derived(deepMerge(data.baseMetaTags, page.data.pageMetaTags));
	let isHomePage = $derived(page.url.pathname === '/');
</script>

<MetaTags {...metaTags} />
<Toaster />
<Snowfall />
<Navbar showFairyLights={isHomePage} />
<main class="min-h-screen">
	{@render children()}
</main>
