<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Menu, X, LogOut, LogIn, UserPlus, ChevronDown } from '@lucide/svelte';
	import { authClient } from '$lib/client/auth-client';
	import logo from '$lib/assets/logo/masterleague.svg';

	let { user } = $derived(page.data);
	let isStudioPage = $derived(page.url.pathname.includes('studio'));

	// Desktop nav items (includes all main items)
	const navItems = [
		{ href: '/', label: 'Home', adminOnly: false },
		{ href: '/predictions', label: 'Predictions', adminOnly: false },
		{ href: '/leaderboard', label: 'Leaderboard', adminOnly: false },
		{ href: '/blog', label: 'Blog', adminOnly: false }
	];

	// Mobile menu items (excludes items in bottom nav)
	const mobileMenuItems = [
		{ href: '/blog', label: 'Blog' }
	];

	const moreItems = [
		{ href: '/standings', label: 'PL Table' },
		{ href: '/hall-of-fame', label: 'Hall of Fame' }
	];

	const adminItems = [
		{ href: '/groups', label: 'Groups' },
		{ href: '/studio', label: 'Studio' },
		{ href: '/admin', label: 'Admin' },
		{ href: '/admin/email-preview', label: 'Email Preview' }
	];

	let isDropdownOpen = $state(false);
	let isAdminDropdownOpen = $state(false);
	let isMoreDropdownOpen = $state(false);
	let isMobileMenuOpen = $state(false);

	// References for click outside detection
	let mobileMenuRef = $state<HTMLElement | null>(null);
	let mobileButtonRef = $state<HTMLElement | null>(null);

	function isNavItemActive(href: string): boolean {
		return href === '/' ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}

	function isAnyAdminItemActive(): boolean {
		return adminItems.some((item) => isNavItemActive(item.href));
	}

	function isAnyMoreItemActive(): boolean {
		return moreItems.some((item) => isNavItemActive(item.href));
	}

	async function handleSignOut() {
		await authClient.signOut();
		goto('/auth/login');
	}

	// Toggle mobile menu with explicit state management
	function toggleMobileMenu(event: MouseEvent | TouchEvent) {
		event.preventDefault();
		event.stopPropagation();
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	// Close mobile menu
	function closeMobileMenu() {
		isMobileMenuOpen = false;
	}

	// Close all dropdowns
	function closeAllDropdowns() {
		isDropdownOpen = false;
		isAdminDropdownOpen = false;
		isMoreDropdownOpen = false;
	}

	// Click outside handler using refs for reliability
	function handleClickOutside(event: MouseEvent | TouchEvent) {
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

		// Close more dropdown if clicked outside
		if (isMoreDropdownOpen) {
			const moreDropdown = document.querySelector('[data-more-dropdown]');
			const moreDropdownButton = document.querySelector('[data-more-dropdown-button]');
			if (
				moreDropdown &&
				moreDropdownButton &&
				!moreDropdown.contains(target) &&
				!moreDropdownButton.contains(target)
			) {
				isMoreDropdownOpen = false;
			}
		}

		// Close mobile menu if clicked outside - use refs for reliability
		if (isMobileMenuOpen && mobileMenuRef && mobileButtonRef) {
			if (!mobileMenuRef.contains(target) && !mobileButtonRef.contains(target)) {
				isMobileMenuOpen = false;
			}
		}
	}

	// Handle escape key to close menus
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeMobileMenu();
			closeAllDropdowns();
		}
	}

	// Close mobile menu on route change
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		page.url.pathname;
		closeMobileMenu();
	});

	// Listen for clicks and touch events
	$effect(() => {
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('touchend', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('touchend', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	});

	// Prevent body scroll when mobile menu is open
	$effect(() => {
		if (isMobileMenuOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<header class="fixed top-0 left-0 z-9999 w-full" style="view-transition-name: header;">
	{#if !isStudioPage}
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

						<!-- More Dropdown -->
						<div class="relative">
							<button
								data-more-dropdown-button
								class="relative flex items-center justify-center gap-1 px-4 py-2 font-medium transition-all duration-200
								{isAnyMoreItemActive() ? 'bg-accent text-black' : 'hover:bg-accent/20'}"
								style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
								onclick={() => (isMoreDropdownOpen = !isMoreDropdownOpen)}
							>
								More
								<ChevronDown class="size-4" />
							</button>

							{#if isMoreDropdownOpen}
								<div
									data-more-dropdown
									class="border-accent/30 absolute top-full left-0 z-10000 mt-2 w-40 border bg-[#0D1326] shadow-xl"
								>
									<div class="p-2">
										{#each moreItems as item}
											{@const isActive = isNavItemActive(item.href)}
											<a
												href={item.href}
												class="hover:bg-accent/20 flex w-full items-center px-3 py-2 transition-colors
												{isActive ? 'bg-accent/30 text-accent' : 'text-slate-300 hover:text-white'}"
												onclick={() => (isMoreDropdownOpen = false)}
											>
												{item.label}
											</a>
										{/each}
									</div>
								</div>
							{/if}
						</div>
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
										class="border-accent/30 absolute top-full right-0 z-10000 mt-2 w-48 border bg-[#0D1326] shadow-xl"
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
										class="border-accent/30 absolute top-full right-0 z-10000 mt-2 w-64 border bg-[#0D1326] shadow-xl"
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

				<!-- Mobile Menu Button - Enhanced touch feedback -->
				<button
					bind:this={mobileButtonRef}
					data-mobile-button
					style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
					class="relative flex size-12 min-h-12 min-w-12 touch-manipulation items-center justify-center text-white transition-all duration-150 select-none md:hidden
					{isMobileMenuOpen ? 'bg-accent text-black' : 'bg-accent/30 hover:bg-accent/50 active:bg-accent active:text-black active:scale-95'}"
					onclick={() => isMobileMenuOpen = !isMobileMenuOpen}
					aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
					aria-expanded={isMobileMenuOpen}
					aria-controls="mobile-menu"
				>
					<span class="sr-only">{isMobileMenuOpen ? 'Close' : 'Open'} navigation menu</span>
					{#if isMobileMenuOpen}
						<X class="size-6" />
					{:else}
						<Menu class="size-6" />
					{/if}
				</button>
			</div>
		</div>

		<!-- Mobile Menu Overlay -->
		{#if isMobileMenuOpen}
			<!-- Backdrop - starts below header -->
			<button
				type="button"
				class="fixed top-[80px] right-0 bottom-0 left-0 z-9998 bg-black/70 md:hidden"
				onclick={closeMobileMenu}
				aria-label="Close menu"
			></button>
		{/if}

		<!-- Mobile Menu -->
		<div
			bind:this={mobileMenuRef}
			data-mobile-menu
			id="mobile-menu"
			class="border-accent/30 fixed top-[80px] right-0 left-0 z-9999 max-h-[calc(100dvh-80px-80px)] overflow-y-auto border-t bg-[#0D1326] shadow-2xl transition-all duration-300 ease-out md:hidden
			{isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}"
			aria-hidden={!isMobileMenuOpen}
		>
			<nav class="container mx-auto flex flex-col gap-1 px-4 py-4 text-sm">
				<!-- Blog and other items not in bottom nav -->
				{#each mobileMenuItems as item}
					{@const isActive = isNavItemActive(item.href)}
					<a
						href={item.href}
						class="flex min-h-12 touch-manipulation items-center gap-3 px-4 py-3 transition-all duration-150
						{isActive ? 'bg-accent font-medium text-black' : 'text-white active:bg-accent/40 active:scale-[0.98]'}"
						onclick={closeMobileMenu}
					>
						{item.label}
					</a>
				{/each}

				<!-- More Items -->
				<div class="border-accent/30 mt-4 border-t pt-4">
					<p class="mb-2 px-4 text-xs font-medium tracking-wider text-slate-400 uppercase">
						More
					</p>
					{#each moreItems as item}
						{@const isActive = isNavItemActive(item.href)}
						<a
							href={item.href}
							class="flex min-h-12 touch-manipulation items-center gap-3 px-4 py-3 transition-all duration-150
							{isActive ? 'bg-accent font-medium text-black' : 'text-white active:bg-accent/40 active:scale-[0.98]'}"
							onclick={closeMobileMenu}
						>
							{item.label}
						</a>
					{/each}
				</div>

				{#if user?.role === 'admin'}
					<div class="border-accent/30 mt-4 border-t pt-4">
						<p class="mb-2 px-4 text-xs font-medium tracking-wider text-slate-400 uppercase">
							Admin
						</p>
						{#each adminItems as item}
							{@const isActive = isNavItemActive(item.href)}
							<a
								href={item.href}
								class="flex min-h-12 touch-manipulation items-center gap-3 px-4 py-3 transition-all duration-150
								{isActive ? 'bg-accent font-medium text-black' : 'text-white active:bg-accent/40 active:scale-[0.98]'}"
								onclick={closeMobileMenu}
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
								class="border-accent/30 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 border py-3 text-center font-medium text-white transition-all duration-150 active:bg-accent/30 active:scale-[0.98]"
								onclick={() => {
									handleSignOut();
									closeMobileMenu();
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
								class="bg-accent flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 py-3 text-center font-medium text-black shadow-md transition-all duration-150 active:opacity-80 active:scale-[0.98]"
								onclick={closeMobileMenu}
							>
								<LogIn class="size-4" />
								Login
							</a>
							<a
								href="/auth/signup"
								class="border-accent/30 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 border py-3 text-center font-medium text-white transition-all duration-150 active:bg-accent/30 active:scale-[0.98]"
								onclick={closeMobileMenu}
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
