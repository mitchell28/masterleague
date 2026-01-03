<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { page } from '$app/state';
	import { MetaTags, deepMerge } from 'svelte-meta-tags';
	import { Toaster } from 'svelte-sonner';

	// Component props
	let { children, data } = $props();

	let metaTags = $derived(deepMerge(data.baseMetaTags, page.data.pageMetaTags));
	let isHomePage = $derived(page.url.pathname === '/');
</script>

<MetaTags {...metaTags} />
<Toaster />
<Navbar />
<main class="min-h-screen sm:py-26 py-20" style="view-transition-name: bottom-nav-content;">
	{@render children()}
</main>
<BottomNav />
