<script lang="ts">
	import { Trophy } from '@lucide/svelte';

	// Hall of Fame data from the image
	const legends = [
		{
			name: 'ASH',
			wins: 8,
			years: [2024, 2023, 2021, 2018, 2015, 2011, 2007, 2005],
			rank: 1
		},
		{
			name: 'BEN',
			wins: 5,
			years: [2014, 2012, 2010, 2009, 2008],
			rank: 2
		},
		{
			name: 'LAURIE',
			wins: 5,
			years: [2022, 2020, 2019, 2017, 2013],
			rank: 3
		},
		{
			name: 'PAUL',
			wins: 3,
			years: [2016, 2006, 2004],
			rank: 4
		},
		{
			name: 'SIMON',
			wins: 1,
			years: [2025],
			rank: 5
		}
	];
</script>

<style>
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(40px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	
	.animate-fade-in-up {
		animation: fadeInUp 0.6s ease-out forwards;
	}
	
	.animate-fade-in {
		animation: fadeIn 0.8s ease-out forwards;
	}
	
	.legend-card {
		animation: fadeInUp 0.6s ease-out forwards;
	}
	
	.legend-card:nth-child(1) { animation-delay: 0.2s; opacity: 0; }
	.legend-card:nth-child(2) { animation-delay: 0.3s; opacity: 0; }
	.legend-card:nth-child(3) { animation-delay: 0.4s; opacity: 0; }
	.legend-card:nth-child(4) { animation-delay: 0.5s; opacity: 0; }
	.legend-card:nth-child(5) { animation-delay: 0.6s; opacity: 0; }
	
</style>

<svelte:head>
	<title>Hall of Fame | Master League</title>
	<meta
		name="description"
		content="The legendary champions of Master League prediction competition since 2004"
	/>
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<!-- Football Pitch Lines Background -->
	<div class="pointer-events-none absolute inset-0 animate-fade-in">
		<!-- Center circle -->
		<div
			class="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 md:h-96 md:w-96"
		></div>
		<div
			class="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20"
		></div>

		<!-- Horizontal pitch lines -->
		<div
			class="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-linear-to-r from-transparent via-white/10 to-transparent"
		></div>

		<!-- Vertical accent lines -->
		<div
			class="absolute top-0 bottom-0 left-1/4 w-px bg-linear-to-b from-transparent via-white/5 to-transparent"
		></div>
		<div
			class="absolute top-0 right-1/4 bottom-0 w-px bg-linear-to-b from-transparent via-white/5 to-transparent"
		></div>

		<!-- Diagonal lines (artsy touch) -->
		<div
			class="via-accent/20 absolute top-0 -left-20 h-[800px] w-px rotate-[35deg] bg-linear-to-b from-transparent to-transparent"
		></div>
		<div
			class="via-accent/10 absolute top-0 right-1/3 h-[900px] w-px rotate-[-35deg] bg-linear-to-b from-transparent to-transparent"
		></div>
	</div>

	<!-- Geometric patterns -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<!-- Small decorative elements -->
		<div class="bg-accent/30 absolute top-[20%] left-[15%] h-3 w-3 rounded-full"></div>
		<div class="absolute top-[15%] right-[25%] h-2 w-2 rounded-full bg-white/20"></div>
		<div
			class="border-accent/40 absolute bottom-[30%] left-[10%] h-4 w-4 rounded-full border"
		></div>
	</div>

	<!-- Content -->
	<div class="relative z-10 mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6">
		<!-- Hero Section -->
		<div class="mb-16 text-center animate-fade-in-up">
			<!-- Crown icon with glow -->
			<div class="mb-8 flex justify-center">
				<div class="relative">
					<div
						class="bg-accent/20 absolute inset-0 animate-pulse rounded-full blur-xl"
						style="animation-duration: 3s;"
					></div>
					<div
						class="border-accent/30 from-accent/20 relative flex h-20 w-20 items-center justify-center border bg-linear-to-br to-emerald-500/10 backdrop-blur-sm"
						style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"
					>
						<svg class="text-accent h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Title -->
			<h1 class="text-5xl font-black tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
				<span
					class="block bg-linear-to-r from-white via-white to-white/60 bg-clip-text text-transparent"
				>
					Hall
				</span>
				<span
					class="from-accent via-accent relative -mt-2 block bg-linear-to-r to-emerald-400 bg-clip-text text-transparent sm:-mt-4"
				>
					of Fame
				</span>
			</h1>

			<!-- Decorative underline -->
			<div
				class="via-accent mx-auto mt-4 h-1 w-32 bg-linear-to-r from-transparent to-transparent sm:w-48"
			></div>

			<p class="mx-auto mt-8 max-w-2xl text-lg font-light text-slate-400 sm:text-xl">
				Celebrating the legendary champions who have dominated Master League since
				<span class="text-accent font-medium">2004</span>
			</p>

			<!-- Stats summary -->
			<div class="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
				<div class="border border-white/10 bg-slate-800/50 px-6 py-3 text-center backdrop-blur-sm">
					<div class="text-2xl font-black text-white sm:text-3xl">22</div>
					<div class="text-xs font-medium tracking-widest text-slate-500 uppercase">Seasons</div>
				</div>
				<div class="border-accent/20 bg-accent/10 border px-6 py-3 text-center backdrop-blur-sm">
					<div class="text-accent text-2xl font-black sm:text-3xl">5</div>
					<div class="text-xs font-medium tracking-widest text-slate-500 uppercase">Champions</div>
				</div>
				<div class="border border-white/10 bg-slate-800/50 px-6 py-3 text-center backdrop-blur-sm">
					<div class="text-2xl font-black text-white sm:text-3xl">∞</div>
					<div class="text-xs font-medium tracking-widest text-slate-500 uppercase">Glory</div>
				</div>
			</div>
		</div>

		<!-- Champions Grid -->
		<div class="space-y-6">
			<!-- Featured Champion (GOAT) -->
			<div class="legend-card">
				<div
					class="group border-accent/20 hover:border-accent/40 hover:shadow-accent/10 relative overflow-hidden border bg-linear-to-br from-slate-800/80 via-slate-800/50 to-slate-900/80 backdrop-blur-xl transition-all duration-500 hover:shadow-2xl"
				>
					<!-- GOAT Banner -->
					<div
						class="from-accent absolute top-6 -right-12 z-20 rotate-45 bg-linear-to-r to-emerald-400 px-16 py-1.5 text-xs font-bold tracking-widest text-slate-900 uppercase shadow-lg"
					>
						GOAT
					</div>

					<!-- Glow effect on hover -->
					<div
						class="from-accent/10 pointer-events-none absolute inset-0 bg-linear-to-br via-transparent to-emerald-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
					></div>

					<div class="relative p-8 sm:p-12">
						<div class="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-12">
							<!-- Left: Rank & Name -->
							<div class="flex flex-col items-center lg:items-start">
								<div class="relative mb-4">
									<div
										class="bg-accent/30 absolute inset-0 animate-pulse rounded-full blur-2xl"
										style="animation-duration: 2s;"
									></div>
									<div
										class="from-accent/20 relative flex h-28 w-28 items-center justify-center bg-linear-to-br to-emerald-500/20 sm:h-32 sm:w-32"
										style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"
									>
										<Trophy class="text-accent h-12 w-12 sm:h-14 sm:w-14" />
									</div>
								</div>
								<h2
									class="from-accent to-accent bg-linear-to-r via-emerald-300 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl lg:text-7xl"
								>
									{legends[0].name}
								</h2>
								<div class="mt-3 flex items-center gap-3">
									<span
										class="border-accent/30 bg-accent/10 text-accent border px-4 py-1.5 text-sm font-bold"
									>
										{legends[0].wins} Championships
									</span>
								</div>
							</div>

							<!-- Right: Years Grid -->
							<div class="flex-1">
								<div
									class="mb-4 text-center text-sm font-medium tracking-widest text-slate-400 uppercase lg:text-left"
								>
									Winning Seasons
								</div>
								<div class="flex flex-wrap justify-center gap-3 lg:justify-start">
									{#each legends[0].years as year, i}
										<div
											class="group/year border-accent/20 hover:border-accent/50 hover:bg-accent/10 relative overflow-hidden border bg-slate-800/50 px-5 py-3 transition-all duration-300"
										>
											<span class="relative z-10 text-lg font-bold text-white">{year}</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Other Champions Grid -->
			<div class="grid gap-6 md:grid-cols-2">
				{#each legends.slice(1) as legend}
					<div class="legend-card">
						<div
							class="group relative h-full overflow-hidden border border-slate-700/50 bg-linear-to-br from-slate-800/60 via-slate-800/40 to-slate-900/60 backdrop-blur-lg transition-all duration-500 hover:border-slate-600/80 hover:shadow-xl hover:shadow-slate-900/50"
						>
							<!-- Subtle glow on hover -->
							<div
								class="to-accent/5 pointer-events-none absolute inset-0 bg-linear-to-br from-white/5 via-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
							></div>

							<div class="relative p-6 sm:p-8">
								<div class="flex items-start gap-6">
									<!-- Rank Hexagon -->
									<div class="shrink-0">
										<div
											class="flex h-16 w-16 items-center justify-center bg-linear-to-br from-slate-700/50 to-slate-800/50 text-3xl font-black text-slate-300 transition-all duration-300 group-hover:text-white sm:h-20 sm:w-20 sm:text-4xl"
											style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"
										>
											{legend.rank}
										</div>
									</div>

									<!-- Content -->
									<div class="flex-1">
										<h3
											class="group-hover:text-accent text-3xl font-black tracking-tight text-white transition-colors duration-300 sm:text-4xl"
										>
											{legend.name}
										</h3>
										<div class="mt-2 flex items-center gap-2">
											<span
												class="border border-slate-600/50 bg-slate-700/50 px-3 py-1 text-sm font-semibold text-slate-300"
											>
												{legend.wins}
												{legend.wins === 1 ? 'Win' : 'Wins'}
											</span>
										</div>

										<!-- Years -->
										<div class="mt-5">
											<div class="flex flex-wrap gap-2">
												{#each legend.years as year, yi}
													<span
														class="border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-sm font-medium text-slate-400 transition-all duration-300 hover:border-slate-600 hover:text-white"
													>
														{year}
														{#if yi === 0 && year === 2025}
															<span class="text-accent ml-1">★</span>
														{/if}
													</span>
												{/each}
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- Bottom accent line -->
							<div
								class="from-accent absolute bottom-0 left-0 h-0.5 w-0 bg-linear-to-r to-emerald-500 transition-all duration-500 group-hover:w-full"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Quick Legend -->
		<div class="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500">
			<div class="flex items-center gap-2">
				<span
					class="bg-accent flex h-5 w-5 items-center justify-center text-[8px] font-bold text-slate-900"
					style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"
				>
					★
				</span>
				<span>Most Recent Title</span>
			</div>
			<div class="flex items-center gap-2">
				<div
					class="bg-accent/20 h-4 w-4"
					style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"
				></div>
				<span>All-Time Leader</span>
			</div>
		</div>
	</div>
</div>
