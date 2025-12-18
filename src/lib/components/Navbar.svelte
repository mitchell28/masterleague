<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { LogOut, LogIn, UserPlus, ChevronDown } from '@lucide/svelte';
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

	}

	// Handle escape key to close menus
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeAllDropdowns();
		}
	}

	// Close mobile menu on route change
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		page.url.pathname;
		closeAllDropdowns();
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

</script>

<header class="relative z-50 w-full" style="view-transition-name: header;">
	{#if !isStudioPage}
		<!-- Main navbar container -->
		<div class="relative w-full bg-[#090e1e] py-2 md:min-h-20">
			<div class="mx-auto flex max-w-7xl items-center justify-center gap-5 px-4 py-2 md:justify-between md:py-4">
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
					<img src={logo} height="56" alt="Master League Logo" class="h-9" />
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

			</div>
		</div>
	{/if}
</header>
