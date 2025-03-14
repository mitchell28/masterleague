<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { Menu, X } from '@lucide/svelte';
	import { authClient } from '$lib/client/auth-client';

	// Use reactive session from authClient
	const session = authClient.useSession();

	// Component props
	let { children } = $props();

	// Reactive state
	let isMenuOpen = $state(false);
	let scrolled = $state(false);
	let fixtureCheckDone = $state(false);
	let email = $state('');

	// Derived values from page data
	let fixtureUpdates = $derived(page.data.fixtureUpdates);

	// Navigation items
	const navItems = [
		{ href: '/predictions', label: 'Predictions', adminOnly: false },
		{ href: '/leaderboard', label: 'Leaderboard', adminOnly: false },
		{ href: '/admin', label: 'Admin', adminOnly: true }
	];

	onMount(() => {
		const handleScroll = () => {
			scrolled = window.scrollY > 10;
		};

		window.addEventListener('scroll', handleScroll);

		// Check for fixture updates when the app loads (only once per session)
		const checkFixtureUpdates = async () => {
			if (!fixtureCheckDone) {
				try {
					// Invalidate the server data to trigger a refresh
					await invalidate('fixtures:updates');

					if (fixtureUpdates?.success && fixtureUpdates.updated > 0) {
						console.log(`Updated ${fixtureUpdates.updated} fixtures with new scores`);
					}
				} catch (err) {
					console.error('Error checking for fixture updates:', err);
				} finally {
					fixtureCheckDone = true;
				}
			}
		};

		// Only check for updates if user is logged in
		if ($session.data?.user) {
			checkFixtureUpdates();
		}

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}
</script>

<header
	class="fixed top-0 left-0 z-50 w-full transition-all duration-300 {scrolled
		? 'bg-black/80 py-2 shadow-md backdrop-blur-lg'
		: 'bg-transparent py-4'}"
>
	<div class="container mx-auto flex items-center justify-between px-4">
		<a href="/" class="flex items-center gap-2">
			<div
				class="silver-gradient glow-button flex size-10 items-center justify-center rounded-xl text-xl font-bold text-black"
			>
				PL
			</div>
			<span class="font-display text-gradient text-xl font-bold">Master League</span>
		</a>

		<!-- Desktop Navigation -->
		<nav class="hidden items-center gap-6 md:flex">
			{#each navItems as item}
				{@const isActive =
					item.href === '/admin'
						? page.url.pathname.startsWith(item.href)
						: page.url.pathname === item.href}
				{@const activeClass =
					item.href === '/admin'
						? 'text-slate-200 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-slate-400'
						: 'text-white after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-white'}
				{@const inactiveClass =
					item.href === '/admin'
						? 'text-slate-400 transition-colors hover:text-slate-200'
						: 'text-slate-400 transition-colors hover:text-white'}

				{#if !item.adminOnly || $session.data?.user?.role === 'admin'}
					<a
						href={item.href}
						class="relative px-3 py-2 text-sm font-medium {isActive ? activeClass : inactiveClass}"
					>
						{item.label}
					</a>
				{/if}
			{/each}

			<div class="ml-4 flex items-center gap-2">
				{#if $session.data}
					<div class="flex items-center gap-2">
						<p class="text-sm text-white">
							{$session.data.user.name}
						</p>
						<button
							class="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-700"
							onclick={async () => {
								await authClient.signOut();
								goto('/auth/login');
							}}
						>
							Logout
						</button>
					</div>
				{:else}
					<div class="flex items-center gap-2">
						<a
							href="/auth/login"
							class="silver-gradient glow-button rounded-lg px-4 py-2 text-sm font-medium text-black shadow-md transition-all hover:shadow-lg"
						>
							Login
						</a>
						<a
							href="/auth/signup"
							class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-700"
						>
							Sign Up
						</a>
					</div>
				{/if}
			</div>
		</nav>

		<!-- Mobile Menu Button -->
		<button
			class="flex size-10 items-center justify-center rounded-lg bg-slate-800 text-white md:hidden"
			onclick={toggleMenu}
			aria-label="Toggle menu"
		>
			{#if isMenuOpen}
				<X class="size-6" />
			{:else}
				<Menu class="size-6" />
			{/if}
		</button>
	</div>

	<!-- Mobile Menu -->
	{#if isMenuOpen}
		<div
			class="animate-in slide-in-from-top absolute top-full left-0 w-full border-t border-slate-800 bg-black/95 shadow-lg backdrop-blur-lg md:hidden"
		>
			<nav class="container mx-auto flex flex-col gap-2 px-4 py-4">
				{#each navItems as item}
					{@const isActive =
						item.href === '/admin'
							? page.url.pathname.startsWith(item.href)
							: page.url.pathname === item.href}
					{@const activeClass =
						item.href === '/admin'
							? 'border-l-2 border-slate-400 bg-slate-900/30 text-slate-200'
							: 'border-l-2 border-white bg-slate-900/30 text-white'}

					{#if !item.adminOnly || $session.data?.user?.role === 'admin'}
						<a
							href={item.href}
							class="rounded-lg px-4 py-3 text-sm font-medium {isActive
								? activeClass
								: 'text-slate-300 hover:bg-slate-800/50'}"
							onclick={() => (isMenuOpen = false)}
						>
							{item.label}
						</a>
					{/if}
				{/each}

				<div class="mt-4 border-t border-slate-800 pt-4">
					{#if $session.data}
						<div class="flex flex-col gap-2">
							<p class="text-center text-sm text-white">
								{$session.data.user.name}
							</p>
							<button
								class="block w-full rounded-lg bg-slate-800 py-3 text-center text-sm font-medium text-white"
								onclick={async () => {
									await authClient.signOut();
									goto('/auth/login');
								}}
							>
								Logout
							</button>
						</div>
					{:else}
						<div class="flex flex-col gap-3">
							<a
								href="/auth/login"
								class="silver-gradient glow-button block w-full rounded-lg py-3 text-center text-sm font-medium text-black"
							>
								Login
							</a>
							<a
								href="/auth/signup"
								class="block w-full rounded-lg border border-slate-700 bg-slate-800 py-3 text-center text-sm font-medium text-white"
							>
								Sign Up
							</a>
						</div>
					{/if}
				</div>
			</nav>
		</div>
	{/if}
</header>

<main class="min-h-screen pt-24 pb-16">
	{@render children()}
</main>

<footer class="border-t border-slate-800 bg-black">
	<div class="container mx-auto px-4 py-8">
		<div class="flex flex-col items-center justify-between gap-4 md:flex-row">
			<div class="flex items-center gap-2">
				<div
					class="silver-gradient glow-button flex size-8 items-center justify-center rounded-lg text-sm font-bold text-black"
				>
					PL
				</div>
				<p class="text-sm text-slate-400">Premier League Prediction Tool</p>
			</div>

			<p class="text-sm text-slate-500">&copy; {new Date().getFullYear()} All rights reserved</p>
		</div>
	</div>
</footer>
