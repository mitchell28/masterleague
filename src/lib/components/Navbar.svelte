<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Menu, X, LogOut, LogIn, UserPlus } from '@lucide/svelte';
	import { authClient } from '$lib/client/auth-client';
	import { fly } from 'svelte/transition';
	import logo from '$lib/assets/logo/masterleague.svg';

	const session = authClient.useSession();
	const navItems = [
		{ href: '/', label: 'Home', adminOnly: false },
		{ href: '/predictions', label: 'Predictions', adminOnly: false },
		{ href: '/leaderboard', label: 'Leaderboard', adminOnly: false },
		{ href: '/groups', label: 'Groups', adminOnly: false }
	];

	let isMenuOpen = $state(false);
	let isDropdownOpen = $state(false);

	function isNavItemActive(href: string): boolean {
		return href === '/' ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}

	async function handleSignOut() {
		await authClient.signOut();
		goto('/auth/login');
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		if (isDropdownOpen) {
			const target = event.target as HTMLElement;
			const dropdown = document.querySelector('[data-dropdown]');
			const button = document.querySelector('[data-dropdown-button]');

			if (dropdown && button && !dropdown.contains(target) && !button.contains(target)) {
				isDropdownOpen = false;
			}
		}
	}

	// Add event listener for click outside
	$effect(() => {
		if (isDropdownOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<header class="fixed top-0 left-0 z-50 w-full">
	<!-- Main navbar container -->
	<div class="relative min-h-[80px] w-full bg-[#0D1326]">
		<div class="container mx-auto flex items-center justify-between gap-10 px-6 py-5">
			<div class="hidden items-center justify-center gap-10 md:flex">
				<a href="/" class="group flex items-center gap-3">
					<img src={logo} height="56" alt="Master League Logo" class="h-12" />
				</a>

				<div class="flex gap-2">
					{#each navItems as item}
						{#if !item.adminOnly || $session.data?.user?.role === 'admin'}
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
						{/if}
					{/each}
				</div>
			</div>

			<!-- Mobile Logo -->
			<a href="/" class="group flex items-center gap-3 md:hidden">
				<img src={logo} height="56" alt="Master League Logo" class="h-12" />
			</a>

			<!-- Desktop Navigation -->
			<nav class="hidden items-center gap-8 md:flex">
				<div class="ml-6 flex items-center gap-3">
					{#if $session.data}
						<div class="relative">
							<button
								data-dropdown-button
								class="flex cursor-pointer items-center gap-2"
								onclick={() => (isDropdownOpen = !isDropdownOpen)}
							>
								<div class="bg-accent flex size-8 items-center justify-center text-black shadow-md">
									{$session.data.user.name.charAt(0).toUpperCase()}
								</div>
							</button>

							<!-- Dropdown -->
							{#if isDropdownOpen}
								<div
									data-dropdown
									class="border-accent/30 absolute top-full right-0 z-[60] mt-2 w-64 rounded-lg border bg-[#0D1326] shadow-xl"
								>
									<div class="border-accent/30 border-b p-4">
										<p class="font-medium text-white">{$session.data.user.name}</p>
										<p class="text-xs text-slate-400">{$session.data.user.email}</p>
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
								<UserPlus class="size-4" />
								Sign Up
							</a>
						</div>
					{/if}
				</div>
			</nav>

			<!-- Mobile Menu Button -->
			<button
				class="hover:bg-accent/20 bg-accent/30 flex size-10 items-center justify-center text-white transition-colors md:hidden"
				style="clip-path: polygon(19% 0%, 100% 0%, 100% 85%, 81% 100%, 0% 100%, 0% 15%);"
				onclick={() => (isMenuOpen = !isMenuOpen)}
				aria-label="Toggle menu"
			>
				{#if isMenuOpen}
					<X class="size-6" />
				{:else}
					<Menu class="size-6" />
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile Menu -->
	{#if isMenuOpen}
		<div
			transition:fly={{ y: -10, duration: 200 }}
			class="border-accent/30 absolute top-full left-0 w-full border-t bg-[#0D1326] shadow-2xl md:hidden"
			style="clip-path: polygon(0% 0%, 100% 0%, 100% 90%, 95% 100%, 5% 100%, 0% 90%);"
		>
			<nav class="container mx-auto flex flex-col gap-2 px-4 py-6 text-sm">
				{#each navItems as item}
					{#if !item.adminOnly || $session.data?.user?.role === 'admin'}
						{@const isActive = isNavItemActive(item.href)}
						<a
							href={item.href}
							class="flex items-center gap-3 px-4 py-3 text-white transition-all duration-200
								{isActive ? 'bg-accent font-medium text-black' : 'hover:bg-accent/20'}"
							style={isActive
								? 'clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);'
								: ''}
							onclick={() => (isMenuOpen = false)}
						>
							{item.label}
						</a>
					{/if}
				{/each}

				<div class="border-accent/30 mt-6 border-t pt-6">
					{#if $session.data}
						<div class="flex flex-col gap-4">
							<div class="flex items-center gap-3 px-4">
								<div
									class="bg-accent flex size-10 items-center justify-center text-black shadow-md"
									style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
								>
									{$session.data.user.name.charAt(0).toUpperCase()}
								</div>
								<p class="font-medium text-white">{$session.data.user.name}</p>
							</div>
							<button
								class="hover:bg-accent/20 border-accent/30 flex w-full items-center justify-center gap-2 border py-3 text-center font-medium text-white transition-all"
								style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
								onclick={handleSignOut}
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
								style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
							>
								<LogIn class="size-4" />
								Login
							</a>
							<a
								href="/auth/signup"
								class="hover:bg-accent/20 border-accent/30 flex w-full items-center justify-center gap-2 border py-3 text-center font-medium text-white transition-all"
								style="clip-path: polygon(8% 0%, 100% 0%, 100% 76%, 91% 100%, 0% 100%, 0% 29%);"
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
