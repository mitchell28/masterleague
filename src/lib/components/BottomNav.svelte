<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Home, Trophy, Target } from '@lucide/svelte';

	const bottomNavItems = [
		{ href: '/', label: 'Home', icon: Home },
		{ href: '/predictions', label: 'Predictions', icon: Target },
		{ href: '/leaderboard', label: 'Leaderboard', icon: Trophy }
	];

	let isStudioPage = $derived(page.url.pathname.includes('studio'));

	function isNavItemActive(href: string): boolean {
		return href === '/' ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}

	function handleNavigation(href: string, event: MouseEvent) {
		event.preventDefault();
		
		// Don't navigate if already on the page
		if (isNavItemActive(href)) return;

		// Check if View Transitions API is supported (Chrome 111+, Safari 18+)
		if (document.startViewTransition) {
			document.startViewTransition(() => {
				goto(href);
			});
		} else {
			goto(href);
		}
	}
</script>

{#if !isStudioPage}
	<nav
		class="fixed bottom-0 left-0 right-0 z-9999 border-t border-accent/30 bg-[#090e1e] pb-safe md:hidden"
		style="view-transition-name: bottom-nav;"
	>
		<div class="flex items-center justify-around py-2">
			{#each bottomNavItems as item}
				{@const isActive = isNavItemActive(item.href)}
				{@const Icon = item.icon}
				<a
					href={item.href}
					onclick={(e) => handleNavigation(item.href, e)}
					class="flex items-center justify-center p-2
					{isActive ? 'text-accent' : 'text-slate-400 active:text-accent'}"
					aria-label={item.label}
				>
					<Icon class="size-6" />
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
