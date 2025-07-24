<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import Navbar from '$lib/components/Navbar.svelte';

	// Use reactive session from authClient
	const session = authClient.useSession();

	// Component props
	let { children } = $props();

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

<Navbar />

<main class="min-h-screen">
	{@render children()}
</main>

<footer class="border-t border-slate-800/50 bg-black/90 backdrop-blur-sm">
	<div class="container mx-auto px-4 py-8">
		<div class="flex flex-col items-center justify-between gap-4 md:flex-row">
			<div class="flex items-center gap-3">
				<div
					class="silver-gradient flex size-8 items-center justify-center rounded-lg text-sm font-bold text-black shadow-md"
				>
					PL
				</div>
				<p class="text-sm font-medium text-slate-400">Premier League Prediction Tool</p>
			</div>

			<p class="text-sm text-slate-500">&copy; {new Date().getFullYear()} All rights reserved</p>
		</div>
	</div>
</footer>
