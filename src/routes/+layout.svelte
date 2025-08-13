<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import Navbar from '$lib/components/Navbar.svelte';
	import { page } from '$app/state';
	import { MetaTags, deepMerge } from 'svelte-meta-tags';

	// Component props
	let { children, data } = $props();

	const session = authClient.useSession();

	let metaTags = $derived(deepMerge(data.baseMetaTags, page.data.pageMetaTags));
	// Use localStorage to track when we last updated fixtures
	// This prevents calling updates too frequently across page loads
	const FIXTURE_UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes
	let fixtureCheckDone = $state(false);

	// Effect for fixture updates
	$effect(() => {
		// Only check for updates if user is logged in and we haven't checked recently
		if ($session.data?.user && !fixtureCheckDone) {
			const lastUpdate = localStorage.getItem('lastFixtureUpdate');
			const now = Date.now();

			// Only update if we haven't done so in the last interval period
			const shouldCheckUpdates =
				!lastUpdate || now - parseInt(lastUpdate) > FIXTURE_UPDATE_INTERVAL;

			if (shouldCheckUpdates) {
				checkFixtureUpdates();
				localStorage.setItem('lastFixtureUpdate', now.toString());
			}

			// Mark as done for this session regardless
			fixtureCheckDone = true;
		}
	});

	// Check for fixture updates when the app loads (only once per interval)
	async function checkFixtureUpdates() {
		try {
			await invalidate('fixtures:updates');
		} catch (err) {
			console.error('Error checking for fixture updates:', err);
		}
	}
</script>

<MetaTags {...metaTags} />
<Navbar />
<main class="min-h-screen">
	{@render children()}
</main>
