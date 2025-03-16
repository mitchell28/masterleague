<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { invalidate } from '$app/navigation';
	import { authClient } from '$lib/client/auth-client';
	import Navbar from '$lib/components/Navbar.svelte';

	// Use reactive session from authClient
	const session = authClient.useSession();

	// Component props
	let { children } = $props();

	// Reactive state
	let fixtureCheckDone = $state(false);

	// Effect for fixture updates
	$effect(() => {
		// Only check for updates if user is logged in
		if ($session.data?.user && !fixtureCheckDone) {
			checkFixtureUpdates();
		}
	});

	// Check for fixture updates when the app loads (only once per session)
	async function checkFixtureUpdates() {
		try {
			await invalidate('fixtures:updates');
		} catch (err) {
			console.error('Error checking for fixture updates:', err);
		} finally {
			fixtureCheckDone = true;
		}
	}
</script>

<Navbar />

<main class="min-h-screen pt-24 pb-16">
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
