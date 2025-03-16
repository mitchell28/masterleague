<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto, invalidate } from '$app/navigation';
	import { Menu, X, Trophy, Home, Settings, LogOut, LogIn, UserPlus } from '@lucide/svelte';
	import { authClient } from '$lib/client/auth-client';
	import { fade, fly } from 'svelte/transition';

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
		{ href: '/predictions', label: 'Predictions', icon: 'Home', adminOnly: false },
		{ href: '/leaderboard', label: 'Leaderboard', icon: 'Trophy', adminOnly: false },
		{ href: '/admin', label: 'Admin', icon: 'Settings', adminOnly: true }
	];

	// Effect for scroll handling
	$effect(() => {
		const handleScroll = () => {
			scrolled = window.scrollY > 10;
		};

		window.addEventListener('scroll', handleScroll);

		// Return cleanup function
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

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

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}
</script>

<header
	class="fixed top-0 left-0 z-50 w-full transition-all duration-300 {scrolled
		? 'bg-black/90 py-2 shadow-xl backdrop-blur-lg'
		: 'bg-gradient-to-b from-black/80 to-transparent py-4'}"
>
	<div class="container mx-auto flex items-center justify-between px-4">
		<a href="/" class="group flex items-center gap-3">
			<div
				class="silver-gradient flex size-10 items-center justify-center rounded-xl text-xl font-bold text-black shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-indigo-500/20"
			>
				PL
			</div>
			<span class="font-display text-gradient text-xl font-bold tracking-tight">Master League</span>
		</a>

		<!-- Desktop Navigation -->
		<nav class="hidden items-center gap-8 md:flex">
			{#each navItems as item}
				{@const isActive =
					item.href === '/admin'
						? page.url.pathname.startsWith(item.href)
						: page.url.pathname === item.href}
				{@const activeClass =
					'text-white font-medium relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-indigo-500 after:rounded-full'}
				{@const inactiveClass =
					'text-slate-400 transition-all duration-200 hover:text-white hover:translate-y-[-1px]'}

				{#if !item.adminOnly || $session.data?.user?.role === 'admin'}
					<a
						href={item.href}
						class="relative flex items-center gap-1.5 px-3 py-2 text-sm {isActive
							? activeClass
							: inactiveClass}"
					>
						{#if item.icon === 'Home'}
							<Home class="size-4" />
						{:else if item.icon === 'Trophy'}
							<Trophy class="size-4" />
						{:else if item.icon === 'Settings'}
							<Settings class="size-4" />
						{/if}
						{item.label}
					</a>
				{/if}
			{/each}

			<div class="ml-6 flex items-center gap-3">
				{#if $session.data}
					<div class="flex items-center gap-6">
						<div class="flex items-center gap-2">
							<div
								class="flex size-8 items-center justify-center rounded-full bg-indigo-600/30 text-white"
							>
								{$session.data.user.name.charAt(0).toUpperCase()}
							</div>
							<p class="text-sm font-medium text-white">
								{$session.data.user.name}
							</p>
						</div>
						<button
							class="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-700 hover:shadow-lg"
							onclick={async () => {
								await authClient.signOut();
								goto('/auth/login');
							}}
						>
							<LogOut class="size-4" />
							Logout
						</button>
					</div>
				{:else}
					<div class="flex items-center gap-3">
						<a
							href="/auth/login"
							class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20"
						>
							<LogIn class="size-4" />
							Login
						</a>
						<a
							href="/auth/signup"
							class="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-700 hover:shadow-lg"
						>
							<UserPlus class="size-4" />
							Sign Up
						</a>
					</div>
				{/if}
			</div>
		</nav>

		<!-- Mobile Menu Button -->
		<button
			class="flex size-10 items-center justify-center rounded-lg bg-slate-800/80 text-white transition-colors hover:bg-slate-700 md:hidden"
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
			transition:fly={{ y: -10, duration: 200 }}
			class="absolute top-full left-0 w-full border-t border-slate-800/50 bg-black/95 shadow-2xl backdrop-blur-lg md:hidden"
		>
			<nav class="container mx-auto flex flex-col gap-2 px-4 py-6">
				{#each navItems as item}
					{@const isActive =
						item.href === '/admin'
							? page.url.pathname.startsWith(item.href)
							: page.url.pathname === item.href}
					{@const activeClass =
						'border-l-2 border-indigo-500 bg-slate-900/50 text-white font-medium'}

					{#if !item.adminOnly || $session.data?.user?.role === 'admin'}
						<a
							href={item.href}
							class="flex items-center gap-3 rounded-lg px-4 py-3 text-sm {isActive
								? activeClass
								: 'text-slate-300 hover:bg-slate-800/50'}"
							onclick={() => (isMenuOpen = false)}
						>
							{#if item.icon === 'Home'}
								<Home class="size-5" />
							{:else if item.icon === 'Trophy'}
								<Trophy class="size-5" />
							{:else if item.icon === 'Settings'}
								<Settings class="size-5" />
							{/if}
							{item.label}
						</a>
					{/if}
				{/each}

				<div class="mt-6 border-t border-slate-800/50 pt-6">
					{#if $session.data}
						<div class="flex flex-col gap-4">
							<div class="flex items-center gap-3 px-4">
								<div
									class="flex size-10 items-center justify-center rounded-full bg-indigo-600/30 text-white"
								>
									{$session.data.user.name.charAt(0).toUpperCase()}
								</div>
								<p class="text-sm font-medium text-white">
									{$session.data.user.name}
								</p>
							</div>
							<button
								class="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800/80 py-3 text-center text-sm font-medium text-white"
								onclick={async () => {
									await authClient.signOut();
									goto('/auth/login');
								}}
							>
								<LogOut class="size-4" />
								Logout
							</button>
						</div>
					{:else}
						<div class="flex flex-col gap-3">
							<a
								href="/auth/login"
								class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-center text-sm font-medium text-white shadow-md"
							>
								<LogIn class="size-4" />
								Login
							</a>
							<a
								href="/auth/signup"
								class="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 py-3 text-center text-sm font-medium text-white"
							>
								<UserPlus class="size-4" />
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
