<script lang="ts">
	import { page } from '$app/state';
	import { goto, preloadData } from '$app/navigation';
	import { Home, Trophy, Target, Loader2 } from '@lucide/svelte';
	import { tick } from 'svelte';

	const bottomNavItems = [
		{ href: '/', label: 'Home', icon: Home },
		{ href: '/predictions', label: 'Predictions', icon: Target },
		{ href: '/leaderboard', label: 'Leaderboard', icon: Trophy }
	];

	let isStudioPage = $derived(page.url.pathname.includes('studio'));
	let isNavigating = $state(false);
	let navigatingTo = $state<string | null>(null);

	function isNavItemActive(href: string): boolean {
		return href === '/' ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}

	async function handleNavigation(href: string, event: MouseEvent) {
		event.preventDefault();
		
		// Don't navigate if already on the page or currently navigating
		if (isNavItemActive(href) || isNavigating) return;

		isNavigating = true;
		navigatingTo = href;
		await tick(); // Ensure loader renders

		try {
			// Preload data first so the spinner stays active during fetch
			await preloadData(href);

			// Check if View Transitions API is supported (Chrome 111+, Safari 18+)
			if (document.startViewTransition) {
				const transition = document.startViewTransition(async () => {
					await goto(href);
				});
				await transition.finished;
			} else {
				await goto(href);
			}
		} catch (error) {
			console.error('Navigation error:', error);
			// Fallback
			await goto(href);
		} finally {
			isNavigating = false;
			navigatingTo = null;
		}
	}
</script>

{#if !isStudioPage}
	<nav
		class="fixed bottom-0 left-0 right-0 z-9999 border-t border-accent/30 bg-[#090e1e] pb-safe md:hidden"
		style="view-transition-name: bottom-nav;"
	>
		<div class="flex items-center justify-around py-1">
			{#each bottomNavItems as item}
				{@const isActive = isNavItemActive(item.href)}
				{@const Icon = item.icon}
				{@const isItemLoading = isNavigating && navigatingTo === item.href}
				<a
					href={item.href}
					onclick={(e) => handleNavigation(item.href, e)}
					class="flex items-center justify-center p-1.5 rounded-lg transition-colors
					{isActive ? 'text-accent' : 'text-slate-400 active:text-accent'}"
					aria-label={item.label}
					aria-busy={isItemLoading}
				>
					{#if isItemLoading}
						<Loader2 class="size-6 animate-spin" />
					{:else}
						<Icon class="size-6" />
					{/if}
				</a>
			{/each}
		</div>
	</nav>
{/if}

<style>
	/* Safe area padding for devices with home indicators */
	.pb-safe {
		padding-bottom: env(safe-area-inset-bottom, 0);
	}
</style>
