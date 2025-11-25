<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import { page } from '$app/state';
	import { MetaTags, deepMerge } from 'svelte-meta-tags';
	import { Toaster } from 'svelte-sonner';
	import Snowfall from '$lib/components/christmas/Snowfall.svelte';
	import FairyLights from '$lib/components/christmas/FairyLights.svelte';

	// Component props
	let { children, data } = $props();

	let metaTags = $derived(deepMerge(data.baseMetaTags, page.data.pageMetaTags));
</script>

<MetaTags {...metaTags} />
<Toaster />
<Snowfall />
<FairyLights />
<Navbar />
<main class="min-h-screen">
	{@render children()}
</main>
