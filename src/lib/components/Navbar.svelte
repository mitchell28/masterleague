<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Menu, X, Trophy, Home, Settings, LogOut, LogIn, UserPlus, Users } from '@lucide/svelte';
	import { authClient } from '$lib/client/auth-client';
	import { fly } from 'svelte/transition';
	import logo from '$lib/assets/logo/master_league_logo.png';
	// Use reactive session from authClient
	const session = authClient.useSession();

	// Navigation items
	const navItems = [
		{ href: '/predictions', label: 'Predictions', icon: 'Home', adminOnly: false },
		{ href: '/leaderboard', label: 'Leaderboard', icon: 'Trophy', adminOnly: false },
		{ href: '/groups', label: 'Organizations', icon: 'Users', adminOnly: false },
		{ href: '/admin', label: 'Admin', icon: 'Settings', adminOnly: true }
	];

	// Reactive state
	let isMenuOpen = $state(false);
	let scrolled = $state(false);

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

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	// Helper function to check if a nav item is active
	function isNavItemActive(href: string): boolean {
		if (href === '/') return page.url.pathname === href;
		if (href === '/admin') return page.url.pathname.startsWith(href);
		return page.url.pathname.startsWith(href);
	}
</script>

<header
	class="fixed top-0 left-0 z-50 w-full transition-all duration-300 {scrolled
		? 'bg-black/90 py-4 shadow-xl backdrop-blur-lg'
		: ' py-6'}"
>
	<div class="container mx-auto flex items-center justify-between px-4">
		<a href="/" class="group flex items-center gap-3">
			<img src={logo} alt="Master League Logo" class="h-10 w-10" />
			<span class="font-display text-gradient text-xl font-bold tracking-tight">Master League</span>
		</a>

		<!-- Desktop Navigation -->
		<nav class="hidden items-center gap-8 md:flex">
			{#each navItems as item}
				{@const isActive = isNavItemActive(item.href)}

				{#if !item.adminOnly || $session.data?.user?.role === 'admin'}
					<a
						data-sveltekit-preload-data="hover"
						href={item.href}
						class="relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all duration-200
							{isActive
							? 'text-white after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-indigo-500'
							: 'text-slate-400 hover:translate-y-[-1px] hover:text-white'}"
					>
						{#if item.icon === 'Home'}
							<Home class="size-4" />
						{:else if item.icon === 'Trophy'}
							<Trophy class="size-4" />
						{:else if item.icon === 'Users'}
							<Users class="size-4" />
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
								class="flex size-8 items-center justify-center rounded-full bg-indigo-600/30 text-white shadow-md"
							>
								{$session.data.user.name.charAt(0).toUpperCase()}
							</div>
							<p class="text-sm font-medium text-white">
								{$session.data.user.name}
							</p>
						</div>
						<button
							class="flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-800/80 px-4 py-2 text-sm font-medium text-white transition-all hover:translate-y-[-1px] hover:bg-slate-700 hover:shadow-lg"
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
							class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:translate-y-[-1px] hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20"
						>
							<LogIn class="size-4" />
							Login
						</a>
						<a
							href="/auth/signup"
							class="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-white transition-all hover:translate-y-[-1px] hover:bg-slate-700 hover:shadow-lg"
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
					{@const isActive = isNavItemActive(item.href)}

					{#if !item.adminOnly || $session.data?.user?.role === 'admin'}
						<a
							href={item.href}
							class="flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-all duration-200
								{isActive
								? 'border-l-2 border-indigo-500 bg-slate-900/50 font-medium text-white'
								: 'text-slate-300 hover:bg-slate-800/50 hover:text-white'}"
							onclick={() => (isMenuOpen = false)}
						>
							{#if item.icon === 'Home'}
								<Home class="size-5" />
							{:else if item.icon === 'Trophy'}
								<Trophy class="size-5" />
							{:else if item.icon === 'Users'}
								<Users class="size-5" />
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
									class="flex size-10 items-center justify-center rounded-full bg-indigo-600/30 text-white shadow-md"
								>
									{$session.data.user.name.charAt(0).toUpperCase()}
								</div>
								<p class="text-sm font-medium text-white">
									{$session.data.user.name}
								</p>
							</div>
							<button
								class="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800/80 py-3 text-center text-sm font-medium text-white transition-all hover:bg-slate-700 hover:shadow-lg"
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
								class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-center text-sm font-medium text-white shadow-md transition-all hover:bg-indigo-500 hover:shadow-lg"
							>
								<LogIn class="size-4" />
								Login
							</a>
							<a
								href="/auth/signup"
								class="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 py-3 text-center text-sm font-medium text-white transition-all hover:bg-slate-700 hover:shadow-lg"
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
