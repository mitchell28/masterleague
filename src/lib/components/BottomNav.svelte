<script lang="ts">
	import { page } from '$app/state';
	import { goto, preloadData } from '$app/navigation';
	import { Home, Trophy, Target, Loader2, Menu, BookOpen, Table, Award, Shield } from '@lucide/svelte';
	import { tick } from 'svelte';
	import Drawer from './Drawer.svelte';

	const bottomNavItems = [
		{ href: '/', label: 'Home', icon: Home },
		{ href: '/predictions', label: 'Predictions', icon: Target },
		{ href: '/leaderboard', label: 'Leaderboard', icon: Trophy }
	];

	const extraItems = [
		{ href: '/blog', label: 'Blog', icon: BookOpen },
		{ href: '/standings', label: 'PL Table', icon: Table },
		{ href: '/hall-of-fame', label: 'Hall of Fame', icon: Award }
	];

	let isStudioPage = $derived(page.url.pathname.includes('studio'));
	let isNavigating = $state(false);
	let navigatingTo = $state<string | null>(null);
	let isDrawerOpen = $state(false);
	let user = $derived(page.data.user);

	function isNavItemActive(href: string): boolean {
		return href === '/' ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}

	async function handleNavigation(href: string, event: MouseEvent) {
		event.preventDefault();
		
		const wasDrawerOpen = isDrawerOpen;
		if (isDrawerOpen) {
			isDrawerOpen = false;
		}

		// Don't navigate if already on the page or currently navigating
		if (isNavItemActive(href) || isNavigating) return;

		// If drawer was open, wait for animation to finish to avoid View Transition flash
		if (wasDrawerOpen) {
			await new Promise((resolve) => setTimeout(resolve, 300));
		}

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
		<div class="flex items-center justify-around pt-2 pb-3">
			{#each bottomNavItems as item}
				{@const isActive = isNavItemActive(item.href)}
				{@const Icon = item.icon}
				{@const isItemLoading = isNavigating && navigatingTo === item.href}
				<a
					href={item.href}
					onclick={(e) => handleNavigation(item.href, e)}
					class="flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors gap-1
					{isActive ? 'text-accent' : 'text-slate-400 active:text-accent'}"
					aria-label={item.label}
					aria-busy={isItemLoading}
				>
					{#if isItemLoading}
						<Loader2 class="size-5 animate-spin" />
					{:else}
						<Icon class="size-5" />
					{/if}
					<span class="text-[10px] font-medium leading-none">{item.label}</span>
				</a>
			{/each}

			<!-- Extra Drawer Trigger -->
			<button
				class="flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors gap-1
				{isDrawerOpen ? 'text-accent' : 'text-slate-400 active:text-accent'}"
				onclick={() => isDrawerOpen = true}
			>
				<Menu class="size-5" />
				<span class="text-[10px] font-medium leading-none">Extra</span>
			</button>

			<!-- Custom Drawer -->
			<Drawer bind:open={isDrawerOpen}>
				<div class="flex flex-col gap-2">
					{#each extraItems as item}
						{@const isActive = isNavItemActive(item.href)}
						{@const Icon = item.icon}
						<a
							href={item.href}
							class="flex items-center gap-3 rounded-lg p-3 transition-colors
							{isActive ? 'bg-accent text-black' : 'text-white hover:bg-white/5'}"
							onclick={(e) => handleNavigation(item.href, e)}
						>
							<Icon class="size-5" />
							<span class="font-medium">{item.label}</span>
						</a>
					{/each}

					{#if user?.role === 'admin'}
						<div class="my-2 border-t border-white/10 pt-2">
							<p class="px-3 text-xs font-medium text-slate-400 uppercase">Admin</p>
						</div>
						<a
							href="/admin"
							class="flex items-center gap-3 rounded-lg p-3 transition-colors text-white hover:bg-white/5"
							onclick={(e) => handleNavigation('/admin', e)}
						>
							<Shield class="size-5" />
							<span class="font-medium">Admin Dashboard</span>
						</a>
					{/if}
				</div>
			</Drawer>
		</div>
	</nav>
{/if}

<style>
	/* Safe area padding for devices with home indicators */
	.pb-safe {
		padding-bottom: env(safe-area-inset-bottom, 0);
	}
</style>
