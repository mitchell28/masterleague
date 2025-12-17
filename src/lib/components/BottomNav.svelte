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

	async function handleNavigation(href: string, event: MouseEvent) {
		event.preventDefault();
		
		// Don't navigate if already on the page
		if (isNavItemActive(href)) return;

		// Check if View Transitions API is supported (Chrome 111+, Safari 18+)
		if (document.startViewTransition) {
			const transition = document.startViewTransition(async () => {
				await goto(href);
			});
			
			// Wait for the transition to be ready (captures snapshots)
			await transition.ready;
			
			// The transition will now animate
			await transition.finished;
		} else {
			// Fallback for browsers without View Transitions support
			await goto(href);
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
					class="flex flex-col items-center gap-1.5 px-4 py-2 transition-all duration-200
					{isActive ? 'text-black' : 'text-slate-400 hover:text-white active:text-accent'}"
				>
					<div
						class="flex size-11 items-center justify-center transition-all duration-200
						{isActive ? 'bg-accent' : 'bg-accent/20'}"
						style="clip-path: polygon(15% 0%, 100% 0%, 100% 80%, 85% 100%, 0% 100%, 0% 20%);"
					>
						<Icon class="size-5" />
					</div>
					<span class="text-xs font-medium {isActive ? 'text-accent' : ''}">{item.label}</span>
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
