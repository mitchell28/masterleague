<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly, scale, slide } from 'svelte/transition';
	import { Trophy, Medal, Users, Search, Crown, Award } from '@lucide/svelte';

	type LeaderboardEntry = {
		userId: string;
		userName: string;
		points: number;
		correctScorelines: number;
		correctOutcomes: number;
		predictedFixtures: number;
		completedFixtures: number;
		rank: number;
	};

	// Use runes syntax
	let { data } = $props<{ data: { leaderboard: LeaderboardEntry[] } }>();

	// Access leaderboard data with debug info
	let leaderboard = $derived(data?.leaderboard || []);

	// Track hovered row for styling
	let hoveredRow: number | null = $state(null);

	// Add some additional derived values for display
	let totalEntries = $derived(leaderboard.length);

	// Search functionality
	let searchQuery = $state('');
	let filteredLeaderboard = $derived(
		searchQuery
			? leaderboard.filter((entry: LeaderboardEntry) =>
					entry.userName.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: leaderboard
	);

	// Get top 3 players for special display
	let topPlayers = $derived(leaderboard.slice(0, 3));
</script>

<div class="container mx-auto px-4 py-6 sm:py-10">
	<div class="mb-8 text-center sm:mb-20" in:fade={{ duration: 800, delay: 200 }}>
		<h1 class="mb-4 text-3xl font-bold text-white sm:text-5xl">
			<span
				class="bg-gradient-to-r from-indigo-300 via-white to-amber-300 bg-clip-text text-transparent"
			>
				Leaderboard
			</span>
		</h1>
		<p class="mx-auto max-w-2xl text-sm text-slate-300 sm:text-base">
			Track your position and see how you compare to other players. Click on any user to view their
			detailed prediction history.
		</p>
	</div>

	<!-- Top 3 Players Showcase (visible on medium screens and up) -->
	{#if topPlayers.length > 0}
		<div class="mb-16 hidden md:block" in:slide={{ duration: 600, delay: 300 }}>
			<div class="flex justify-center gap-6">
				<!-- Second Place -->
				{#if topPlayers[1]}
					<div
						class="w-1/4 transform transition-all duration-300 hover:scale-105"
						in:fly={{ y: 20, duration: 600, delay: 450 }}
					>
						<a href={`/leaderboard/user/${topPlayers[1].userId}`} class="block">
							<div class="flex flex-col items-center">
								<div class="relative mb-4">
									<div
										class="absolute -top-2 -right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-lg font-bold shadow-lg"
									>
										2
									</div>
									<div
										class="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-slate-300 to-slate-400 shadow-[0_0_15px_rgba(203,213,225,0.4)]"
									>
										<Medal size={48} class="text-slate-800" />
									</div>
								</div>
								<div
									class="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-4 text-center shadow-lg backdrop-blur-sm"
								>
									<p class="mb-1 truncate text-lg font-bold text-white">
										{topPlayers[1].userName}
									</p>
									<p class="mb-3 text-xl font-bold text-slate-300">
										{topPlayers[1].points} pts
									</p>
									<div class="grid grid-cols-2 gap-2 text-xs">
										<div class="rounded-lg bg-slate-700/50 p-2">
											<span class="block text-sm font-semibold text-green-400"
												>{topPlayers[1].correctScorelines}</span
											>
											<span class="text-slate-300">Exact</span>
										</div>
										<div class="rounded-lg bg-slate-700/50 p-2">
											<span class="block text-sm font-semibold text-blue-400"
												>{topPlayers[1].correctOutcomes}</span
											>
											<span class="text-slate-300">Outcomes</span>
										</div>
									</div>
								</div>
							</div>
						</a>
					</div>
				{/if}

				<!-- First Place -->
				{#if topPlayers[0]}
					<div
						class="-mt-8 w-1/3 transform transition-all duration-300 hover:scale-105"
						in:fly={{ y: -20, duration: 600, delay: 300 }}
					>
						<a href={`/leaderboard/user/${topPlayers[0].userId}`} class="block">
							<div class="flex flex-col items-center">
								<div class="relative mb-4">
									<div class="absolute -top-5 left-1/2 z-20 -translate-x-1/2">
										<Crown
											size={40}
											class="text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]"
										/>
									</div>
									<div
										class="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-yellow-400 to-amber-600 shadow-[0_0_30px_rgba(255,215,0,0.6)]"
									>
										<Trophy size={64} class="text-slate-900" />
									</div>
								</div>
								<div
									class="w-full rounded-xl border border-yellow-600/50 bg-gradient-to-b from-slate-800/90 to-slate-800/80 p-5 text-center shadow-xl backdrop-blur-sm"
								>
									<p class="mb-2 truncate text-2xl font-bold text-white">
										{topPlayers[0].userName}
									</p>
									<p class="mb-4 text-3xl font-bold text-yellow-400">
										{topPlayers[0].points} pts
									</p>
									<div class="grid grid-cols-2 gap-3 text-xs">
										<div class="rounded-lg bg-slate-700/50 p-3">
											<span class="block text-lg font-semibold text-green-400"
												>{topPlayers[0].correctScorelines}</span
											>
											<span class="text-slate-300">Exact Scores</span>
										</div>
										<div class="rounded-lg bg-slate-700/50 p-3">
											<span class="block text-lg font-semibold text-blue-400"
												>{topPlayers[0].correctOutcomes}</span
											>
											<span class="text-slate-300">Outcomes</span>
										</div>
									</div>
								</div>
							</div>
						</a>
					</div>
				{/if}

				<!-- Third Place -->
				{#if topPlayers[2]}
					<div
						class="w-1/4 transform transition-all duration-300 hover:scale-105"
						in:fly={{ y: 20, duration: 600, delay: 600 }}
					>
						<a href={`/leaderboard/user/${topPlayers[2].userId}`} class="block">
							<div class="flex flex-col items-center">
								<div class="relative mb-4">
									<div
										class="absolute -top-2 -right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-lg font-bold shadow-lg"
									>
										3
									</div>
									<div
										class="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-amber-700 to-amber-800 shadow-[0_0_15px_rgba(180,83,9,0.4)]"
									>
										<Award size={48} class="text-amber-200" />
									</div>
								</div>
								<div
									class="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-4 text-center shadow-lg backdrop-blur-sm"
								>
									<p class="mb-1 truncate text-lg font-bold text-white">
										{topPlayers[2].userName}
									</p>
									<p class="mb-3 text-xl font-bold text-amber-600">
										{topPlayers[2].points} pts
									</p>
									<div class="grid grid-cols-2 gap-2 text-xs">
										<div class="rounded-lg bg-slate-700/50 p-2">
											<span class="block text-sm font-semibold text-green-400"
												>{topPlayers[2].correctScorelines}</span
											>
											<span class="text-slate-300">Exact</span>
										</div>
										<div class="rounded-lg bg-slate-700/50 p-2">
											<span class="block text-sm font-semibold text-blue-400"
												>{topPlayers[2].correctOutcomes}</span
											>
											<span class="text-slate-300">Outcomes</span>
										</div>
									</div>
								</div>
							</div>
						</a>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Search bar -->
	<div class="relative mb-6" in:slide={{ duration: 400, delay: 600 }}>
		<div
			class="flex items-center rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 shadow-md focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500"
		>
			<Search size={20} class="mr-3 text-slate-400" />
			<input
				type="text"
				placeholder="Search players..."
				bind:value={searchQuery}
				class="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none"
			/>
		</div>
	</div>

	<div
		class="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/70 shadow-xl backdrop-blur-md"
		in:slide={{ duration: 600, delay: 800 }}
	>
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-700/50">
				<thead>
					<tr class="bg-slate-800/90">
						<th
							class="px-3 py-3 text-left text-xs font-medium tracking-wider text-white uppercase sm:px-6 sm:py-4"
						>
							Rank
						</th>
						<th
							class="px-3 py-3 text-left text-xs font-medium tracking-wider text-white uppercase sm:px-6 sm:py-4"
						>
							Name
						</th>
						<th
							class="px-3 py-3 text-center text-xs font-medium tracking-wider text-white uppercase sm:px-6 sm:py-4"
						>
							Points
						</th>
						<th
							class="hidden px-3 py-3 text-center text-xs font-medium tracking-wider text-white uppercase sm:table-cell sm:px-6 sm:py-4"
						>
							Correct <span class="hidden md:inline">Scores</span>
						</th>
						<th
							class="hidden px-3 py-3 text-center text-xs font-medium tracking-wider text-white uppercase sm:table-cell sm:px-6 sm:py-4"
						>
							Correct <span class="hidden md:inline">Outcomes</span>
						</th>
						<th
							class="group relative hidden px-3 py-3 text-center text-xs font-medium tracking-wider text-white uppercase sm:px-6 sm:py-4 md:table-cell"
						>
							<span>Pred/Comp</span>
							<div
								transition:fade
								class="absolute bottom-full left-1/2 z-10 mb-1 hidden w-48 -translate-x-1/2 transform rounded bg-slate-900 p-2 text-xs text-white shadow-lg transition-opacity duration-200 group-hover:block"
							>
								Predictions made / Completed fixtures
							</div>
						</th>
						<th
							class="hidden px-3 py-3 text-center text-xs font-medium tracking-wider text-white uppercase sm:px-6 sm:py-4 lg:table-cell"
						>
							Success Rate
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-700/50">
					{#if !filteredLeaderboard || filteredLeaderboard.length === 0}
						<tr>
							<td
								colspan="7"
								class="px-3 py-6 text-center text-base font-medium text-white sm:px-6 sm:py-8 sm:text-lg"
							>
								{searchQuery ? 'No players found matching your search' : 'No entries yet'}
							</td>
						</tr>
					{:else}
						{#each filteredLeaderboard as entry, index}
							<tr
								class="cursor-pointer transition-all duration-200 {entry.rank === 1
									? 'bg-yellow-900/20'
									: entry.rank <= 3
										? 'bg-slate-800/50'
										: 'bg-slate-800/20'} {hoveredRow === index
									? 'bg-slate-700'
									: 'hover:bg-slate-700/70'}"
								in:slide={{ duration: 300, delay: 900 + index * 50, axis: 'x' }}
							>
								<td
									class="px-3 py-3 text-sm font-medium whitespace-nowrap text-white sm:px-6 sm:py-4"
									colspan="1"
								>
									<a
										href={`/leaderboard/user/${entry.userId}`}
										class="inline-block h-full w-full"
										onfocus={() => (hoveredRow = index)}
										onblur={() => (hoveredRow = null)}
									>
										<span
											class="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 sm:text-sm {entry.rank ===
											1
												? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-[0_0_10px_rgba(255,215,0,0.5)]'
												: entry.rank === 2
													? 'bg-gradient-to-r from-slate-300 to-slate-400 text-black'
													: entry.rank === 3
														? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
														: 'bg-slate-700 text-white'}"
										>
											{entry.rank || index + 1}
										</span>
									</a>
								</td>
								<td
									class="px-3 py-3 text-xs font-semibold whitespace-nowrap text-white sm:px-6 sm:py-4 sm:text-sm"
								>
									<a href={`/leaderboard/user/${entry.userId}`} class="inline-block h-full w-full">
										{entry.userName || 'Unknown User'}
									</a>
								</td>
								<td
									class="px-3 py-3 text-center text-sm font-bold text-white sm:px-6 sm:py-4 sm:text-base"
								>
									<a href={`/leaderboard/user/${entry.userId}`} class="inline-block h-full w-full">
										{entry.points || 0}
									</a>
								</td>
								<td
									class="hidden px-3 py-3 text-center text-xs font-medium text-green-400 sm:table-cell sm:px-6 sm:py-4 sm:text-sm"
								>
									<a href={`/leaderboard/user/${entry.userId}`} class="inline-block h-full w-full">
										{entry.correctScorelines || 0}
									</a>
								</td>
								<td
									class="hidden px-3 py-3 text-center text-xs font-medium text-blue-400 sm:table-cell sm:px-6 sm:py-4 sm:text-sm"
								>
									<a href={`/leaderboard/user/${entry.userId}`} class="inline-block h-full w-full">
										{entry.correctOutcomes || 0}
									</a>
								</td>
								<td
									class="hidden px-3 py-3 text-center text-xs font-medium text-white sm:px-6 sm:py-4 sm:text-sm md:table-cell"
								>
									<a href={`/leaderboard/user/${entry.userId}`} class="inline-block h-full w-full">
										{entry.predictedFixtures || 0}/{entry.completedFixtures || 0}
									</a>
								</td>
								<td
									class="hidden px-3 py-3 text-center text-xs font-medium text-yellow-400 sm:px-6 sm:py-4 sm:text-sm lg:table-cell"
								>
									<a href={`/leaderboard/user/${entry.userId}`} class="inline-block h-full w-full">
										{entry.completedFixtures
											? Math.round(
													((entry.correctScorelines + entry.correctOutcomes) /
														entry.completedFixtures) *
														100
												)
											: 0}%
									</a>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	{#if totalEntries > 0}
		<div
			class="mt-4 flex items-center justify-between text-xs font-medium text-slate-300 sm:mt-5 sm:text-sm"
			in:fade={{ duration: 400, delay: 1200 }}
		>
			<div class="flex items-center">
				<Users size={16} class="mr-2" />
				<span>Total players: {totalEntries}</span>
			</div>
			{#if searchQuery && filteredLeaderboard.length < totalEntries}
				<div>Showing {filteredLeaderboard.length} of {totalEntries} players</div>
			{/if}
		</div>
	{/if}

	<!-- Only show explanation if we have data -->
	{#if totalEntries > 0}
		<div class="mt-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-300">
			<h2 class="mb-2 text-lg font-bold text-white">Scoring System</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div>
					<h3 class="mb-1 font-semibold text-white">Base Points</h3>
					<ul class="list-inside list-disc space-y-1">
						<li>Exact score: <span class="font-bold text-green-400">3 points</span></li>
						<li>Correct outcome only: <span class="font-bold text-blue-400">1 point</span></li>
					</ul>
				</div>
				<div>
					<h3 class="mb-1 font-semibold text-white">Match Multipliers</h3>
					<ul class="list-inside list-disc space-y-1">
						<li>Regular matches: <span class="font-bold text-slate-400">1×</span></li>
						<li>Exciting matches: <span class="font-bold text-yellow-400">2×</span></li>
						<li>Derby matches: <span class="font-bold text-yellow-400">3×</span></li>
					</ul>
				</div>
				<div>
					<h3 class="mb-1 font-semibold text-white">Examples</h3>
					<ul class="list-inside list-disc space-y-1">
						<li>
							Perfect prediction on 3× match: <span class="font-bold text-green-400">9 points</span>
						</li>
						<li>
							Correct outcome on 3× match: <span class="font-bold text-blue-400">3 points</span>
						</li>
						<li>
							Perfect prediction on 2× match: <span class="font-bold text-green-400">6 points</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	{/if}
</div>
