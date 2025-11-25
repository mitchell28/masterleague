<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Menu, X, LogOut, LogIn, UserPlus } from '@lucide/svelte';
	import { authClient } from '$lib/client/auth-client';
	import logo from '$lib/assets/logo/masterleague.svg';

	let { showFairyLights = false }: { showFairyLights?: boolean } = $props();

	let { user } = $derived(page.data);
	let isStudioPage = $derived(page.url.pathname.includes('studio'));

	const navItems = [
		{ href: '/', label: 'Home', adminOnly: false },
		{ href: '/predictions', label: 'Predictions', adminOnly: false },
		{ href: '/leaderboard', label: 'Leaderboard', adminOnly: false },
		{ href: '/blog', label: 'Blog', adminOnly: false }
	];

	const adminItems = [
		{ href: '/groups', label: 'Groups' },
		{ href: '/studio', label: 'Studio' },
		{ href: '/admin', label: 'Admin' }
	];

	let isDropdownOpen = $state(false);
	let isAdminDropdownOpen = $state(false);
	let isMobileMenuOpen = $state(false);

	function isNavItemActive(href: string): boolean {
		return href === '/' ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}

	function isAnyAdminItemActive(): boolean {
		return adminItems.some((item) => isNavItemActive(item.href));
	}

	async function handleSignOut() {
		await authClient.signOut();
		goto('/auth/login');
	}

	// Simple click outside handler
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;

		// Close dropdown if clicked outside
		if (isDropdownOpen) {
			const dropdown = document.querySelector('[data-dropdown]');
			const dropdownButton = document.querySelector('[data-dropdown-button]');
			if (
				dropdown &&
				dropdownButton &&
				!dropdown.contains(target) &&
				!dropdownButton.contains(target)
			) {
				isDropdownOpen = false;
			}
		}

		// Close admin dropdown if clicked outside
		if (isAdminDropdownOpen) {
			const adminDropdown = document.querySelector('[data-admin-dropdown]');
			const adminDropdownButton = document.querySelector('[data-admin-dropdown-button]');
			if (
				adminDropdown &&
				adminDropdownButton &&
				!adminDropdown.contains(target) &&
				!adminDropdownButton.contains(target)
			) {
				isAdminDropdownOpen = false;
			}
		}

		// Close mobile menu if clicked outside
		if (isMobileMenuOpen) {
			const mobileMenu = document.querySelector('[data-mobile-menu]');
			const mobileButton = document.querySelector('[data-mobile-button]');
			if (
				mobileMenu &&
				mobileButton &&
				!mobileMenu.contains(target) &&
				!mobileButton.contains(target)
			) {
				isMobileMenuOpen = false;
			}
		}
	}

	// Always listen for clicks - simpler and more reliable
	$effect(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<header class="fixed top-0 left-0 z-50 w-full">
	{#if !isStudioPage}
		{#if showFairyLights}
			<!-- Christmas fairy lights hanging from bottom of navbar -->
			<div
				class="pointer-events-none absolute bottom-0 left-0 z-10 w-full translate-y-full overflow-hidden select-none"
			>
				<!-- The wire connecting all lights - extended for wide screens -->
				<svg
					class="absolute top-0 left-0 h-5 w-full"
					preserveAspectRatio="none"
					viewBox="0 0 2400 20"
				>
					<path
						d="M0,2 Q50,14 100,4 Q150,16 200,6 Q250,14 300,4 Q350,16 400,6 Q450,14 500,4 Q550,16 600,6 Q650,14 700,4 Q750,16 800,6 Q850,14 900,4 Q950,16 1000,6 Q1050,14 1100,4 Q1150,16 1200,6 Q1250,14 1300,4 Q1350,16 1400,6 Q1450,14 1500,4 Q1550,16 1600,6 Q1650,14 1700,4 Q1750,16 1800,6 Q1850,14 1900,4 Q1950,16 2000,6 Q2050,14 2100,4 Q2150,16 2200,6 Q2250,14 2300,4 Q2350,16 2400,6"
						stroke="#2a2a2a"
						stroke-width="2"
						fill="none"
					/>
				</svg>
				<!-- Light bulbs -->
				<div class="flex w-full justify-between px-4">
					{#each Array(20) as _, i}
						{@const colors = ['#ffcc00', '#ff3333', '#33ff33', '#ffcc00', '#ff3333', '#33ff33']}
						{@const color = colors[i % colors.length]}
						<div
							class="relative {i % 2 === 1 ? 'hidden sm:block' : ''}"
							style="margin-top: {2 + Math.sin(i * 0.5 + 1) * 4}px;"
						>
							<!-- Wire to bulb -->
							<div class="mx-auto h-1.5 w-0.5 bg-gray-600"></div>
							<!-- Bulb base -->
							<div class="mx-auto h-1 w-2 rounded-t-sm bg-gray-500"></div>
							<!-- Bulb -->
							<div
								class="bulb h-2.5 w-2 rounded-b-full"
								style="
									background: {color};
									animation-delay: {i * 0.15 + 0.5}s;
									box-shadow: 0 0 6px {color}, 0 0 12px {color}60;
								"
							></div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Main navbar container -->
		<div class="relative w-full bg-[#090e1e] md:min-h-20">
			<div class="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-4">
				<div class="hidden items-center justify-center gap-10 md:flex">
					<a href="/" class="group relative flex items-center gap-3">
						<img src={logo} height="56" alt="Master League Logo" class="h-14 min-h-14 min-w-14" />
					</a>

					<div class="flex gap-2">
						{#each navItems as item}
							{@const isActive = isNavItemActive(item.href)}
							<a
								data-sveltekit-preload-data="hover"
								href={item.href}
								class="text- relative flex items-center justify-center px-4 py-2 font-medium transition-all duration-200
								{isActive ? 'bg-accent text-black' : 'hover:bg-accent/20'}"
								style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
							>
								{item.label}
							</a>
						{/each}
					</div>
				</div>

				<!-- Mobile Logo -->
				<a href="/" class="group relative flex items-center gap-3 md:hidden">
					<img src={logo} height="56" alt="Master League Logo" class="h-12" />
				</a>

				<!-- Desktop Navigation -->
				<nav class="hidden items-center gap-8 md:flex">
					<div class="flex items-center gap-3">
						{#if user?.role === 'admin'}
							<div class="relative">
								<button
									data-admin-dropdown-button
									class=" hover:bg-accent/30 flex items-center gap-2 px-3 py-2 text-white transition-all duration-200"
									style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
									onclick={() => (isAdminDropdownOpen = !isAdminDropdownOpen)}
								>
									Admin ▼
								</button>

								{#if isAdminDropdownOpen}
									<div
										data-admin-dropdown
										class="border-accent/30 absolute top-full right-0 z-60 mt-2 w-48 border bg-[#0D1326] shadow-xl"
									>
										<div class="p-2">
											{#each adminItems as item}
												{@const isActive = isNavItemActive(item.href)}
												<a
													href={item.href}
													class="hover:bg-accent/20 flex w-full items-center px-3 py-2 transition-colors
													{isActive ? 'bg-accent/30 text-accent' : 'text-slate-300 hover:text-white'}"
													onclick={() => (isAdminDropdownOpen = false)}
												>
													{item.label}
												</a>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}

						{#if user}
							<div class="relative">
								<button
									data-dropdown-button
									class="flex cursor-pointer items-center gap-2"
									onclick={() => (isDropdownOpen = !isDropdownOpen)}
								>
									<div
										class="bg-accent flex size-8 items-center justify-center text-black shadow-md"
									>
										{user?.name.charAt(0).toUpperCase()}
									</div>
								</button>

								<!-- Dropdown -->
								{#if isDropdownOpen}
									<div
										data-dropdown
										class="border-accent/30 absolute top-full right-0 z-[60] mt-2 w-64 border bg-[#0D1326] shadow-xl"
									>
										<div class="border-accent/30 border-b p-4">
											<p class="font-medium text-white">{user?.name}</p>
											<p class="text-xs text-slate-400">{user?.email}</p>
										</div>
										<div class="p-2">
											<button
												class="hover:bg-accent/20 flex w-full items-center gap-2 px-3 py-2 text-slate-300 transition-colors hover:text-white"
												onclick={() => {
													handleSignOut();
													isDropdownOpen = false;
												}}
											>
												<LogOut class="size-4" />
												Logout
											</button>
										</div>
									</div>
								{/if}
							</div>
						{:else}
							<div class="flex items-center gap-3">
								<a
									href="/auth/login"
									class="flex items-center gap-1.5 px-4 py-2 shadow-md transition-all hover:opacity-90 hover:shadow-lg
									{isNavItemActive('/auth/login') ? 'bg-accent text-black' : 'text-white'}"
									style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
								>
									<LogIn class="size-4" />
									Login
								</a>
								<a
									href="/auth/signup"
									class="flex items-center gap-1.5 px-4 py-2 transition-all
									{isNavItemActive('/auth/signup') ? 'bg-accent text-black' : 'hover:bg-accent/20 text-white'}"
									style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
								>
									<UserPlus class="size-4 min-w-4" />
									Sign Up
								</a>
							</div>
						{/if}
					</div>
				</nav>

				<!-- Mobile Menu Button -->
				<button
					data-mobile-button
					style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
					class="hover:bg-accent/20 bg-accent/30 flex size-10 items-center justify-center text-white transition-colors md:hidden"
					onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
					aria-label="Toggle menu"
				>
					<Menu class="size-6 {isMobileMenuOpen ? 'hidden' : 'block'}" />
					<X class="size-6 {isMobileMenuOpen ? 'block' : 'hidden'}" />
				</button>
			</div>
		</div>

		<!-- Mobile Menu -->
		{#if isMobileMenuOpen}
			<div
				data-mobile-menu
				class="border-accent/30 absolute top-full left-0 w-full border-t bg-[#0D1326] shadow-2xl md:hidden"
			>
				<nav class="container mx-auto flex flex-col gap-2 px-4 py-6 text-sm">
					{#each navItems as item}
						{@const isActive = isNavItemActive(item.href)}
						<a
							href={item.href}
							class="flex items-center gap-3 px-4 py-3 transition-all duration-200
							{isActive ? 'bg-accent font-medium text-black' : 'hover:bg-accent/20 text-white'}"
							onclick={() => (isMobileMenuOpen = false)}
						>
							{item.label}
						</a>
					{/each}

					{#if user?.role === 'admin'}
						<div class="border-accent/30 mt-4 border-t pt-4">
							<p class="mb-2 px-4 text-xs font-medium tracking-wider text-slate-400 uppercase">
								Admin
							</p>
							{#each adminItems as item}
								{@const isActive = isNavItemActive(item.href)}
								<a
									href={item.href}
									class="flex items-center gap-3 px-4 py-3 transition-all duration-200
									{isActive ? 'bg-accent font-medium text-black' : 'hover:bg-accent/20 text-white'}"
									onclick={() => (isMobileMenuOpen = false)}
								>
									{item.label}
								</a>
							{/each}
						</div>
					{/if}

					<div class="border-accent/30 mt-6 border-t pt-6">
						{#if user?.emailVerified}
							<div class="flex flex-col gap-4">
								<div class="flex items-center gap-3 px-4">
									<div
										class="bg-accent flex size-10 items-center justify-center text-black shadow-md"
										style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
									>
										{user?.name.charAt(0).toUpperCase()}
									</div>
									<p class="font-medium text-white">{user?.name}</p>
								</div>
								<button
									class="hover:bg-accent/20 border-accent/30 flex w-full items-center justify-center gap-2 border py-3 text-center font-medium text-white transition-all"
									onclick={() => {
										handleSignOut();
										isMobileMenuOpen = false;
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
									class="bg-accent flex w-full items-center justify-center gap-2 py-3 text-center font-medium text-black shadow-md transition-all hover:opacity-90 hover:shadow-lg"
									onclick={() => (isMobileMenuOpen = false)}
								>
									<LogIn class="size-4" />
									Login
								</a>
								<a
									href="/auth/signup"
									class="hover:bg-accent/20 border-accent/30 flex w-full items-center justify-center gap-2 border py-3 text-center font-medium text-white transition-all"
									onclick={() => (isMobileMenuOpen = false)}
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
	{/if}
</header>

<style>
	.bulb {
		animation: twinkle 1s ease-in-out infinite alternate;
	}

	@keyframes twinkle {
		0% {
			opacity: 0.5;
			filter: brightness(0.7);
		}
		100% {
			opacity: 1;
			filter: brightness(1.4);
		}
	}
</style>
