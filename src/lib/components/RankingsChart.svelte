<script lang="ts">
	import { Chart, Svg, Axis, Spline, Highlight, Tooltip, Points } from 'layerchart';
	import { scaleLinear } from 'd3-scale';
	import { curveLinear } from 'd3-shape';
	import { Trophy } from '@lucide/svelte';
	import type { UserRankingHistory } from '$lib/types/analytics';

	const CHART_PADDING = { left: 48, bottom: 32, right: 24, top: 24 };
	const STROKE_WIDTH_CURRENT = 3;
	const STROKE_WIDTH_DEFAULT = 2;
	const OPACITY_CURRENT = 1;
	const OPACITY_DEFAULT = 0.8;
	const POINT_RADIUS = 4;
	const Y_AXIS_ROUNDING = 10;
	const AXIS_TICK_DX = -4;
	const AXIS_TICK_DY = 4;

	let { 
		rankingHistory = [], 
		availableWeeks = [], 
		currentUserId 
	}: { 
		rankingHistory: UserRankingHistory[]; 
		availableWeeks: number[]; 
		currentUserId: string; 
	} = $props();

	// Show all users
	let displayedUsers = $derived(rankingHistory);

	// Check if we have valid data to display
	let hasValidData = $derived(
		displayedUsers.length > 0 &&
			availableWeeks.length > 0 &&
			displayedUsers.some((u) => u.rankings && u.rankings.length > 0)
	);

	// Prepare data for the chart
	// We need two forms of data:
	// 1. "Long" format (userLines) for drawing individual lines
	// 2. "Wide" format (chartData) for the tooltip and shared X-axis

	// 1. User Lines (for Spline)
	let userLines = $derived.by(() => {
		return displayedUsers.map(user => {
			// Start with week 0, points 0
			const data = [{ week: 0, points: 0 }];
			
			// Add existing rankings
			if (user.rankings) {
				// Sort rankings by weekId to ensure proper order
				const sortedRankings = [...user.rankings].sort((a, b) => a.weekId - b.weekId);
				sortedRankings.forEach(r => {
					data.push({ week: r.weekId, points: r.points });
				});
			}

			return {
				userId: user.userId,
				username: user.username,
				color: user.color,
				data
			};
		});
	});

	// 2. Chart Data (Wide format for Tooltip / Domain calculation)
	let chartData = $derived.by(() => {
		if (!hasValidData) return [];
		
		const weeks = [0, ...availableWeeks].sort((a, b) => a - b);
		
		return weeks.map((week, index) => {
			const entry: Record<string, any> = { week };
			
			displayedUsers.forEach(user => {
				if (week === 0) {
					entry[user.userId] = 0;
					entry[`${user.userId}_weekly`] = 0;
				} else {
					const ranking = user.rankings?.find(r => r.weekId === week);
					
					// Find previous points for weekly delta
					let prevPoints = 0;
					if (index > 0) {
						const prevWeek = weeks[index - 1];
						if (prevWeek !== 0) {
							const prevRanking = user.rankings?.find(r => r.weekId === prevWeek);
							prevPoints = prevRanking ? prevRanking.points : 0;
						}
					}

					if (ranking) {
						entry[user.userId] = ranking.points;
						entry[`${user.userId}_weekly`] = ranking.points - prevPoints;
					}
				}
			});
			return entry;
		});
	});

	// Calculate Domains
	let maxWeek = $derived(availableWeeks.length > 0 ? Math.max(...availableWeeks) : 1);
	
	let maxPoints = $derived.by(() => {
		let max = 0;
		userLines.forEach(line => {
			line.data.forEach(d => {
				if (d.points > max) max = d.points;
			});
		});
		return Math.ceil((max + Y_AXIS_ROUNDING) / Y_AXIS_ROUNDING) * Y_AXIS_ROUNDING;
	});
</script>

<div class="mx-auto max-w-6xl ">
	<!-- Chart Container -->
	<div class="mb-6 overflow-hidden  bg-slate-900 backdrop-blur">
		<div class="border-b border-slate-700 px-4 py-3 sm:px-6">
			<h2 class="text-sm font-medium text-slate-300">Points Progression by Gameweek</h2>
		</div>
		<div class="h-100 p-4 sm:h-125 sm:p-6">
			{#if hasValidData}
				<Chart
					data={chartData}
					x="week"
					xScale={scaleLinear().domain([0, maxWeek])}
					yDomain={[0, maxPoints]}
					yNice
					padding={CHART_PADDING}
					tooltip={{ mode: 'bisect-x' }}
				>
					<Svg>
						<Axis
							placement="left"
							grid={{ class: 'stroke-slate-700/50' }}
							rule={{ class: 'stroke-slate-700' }}
							tickLabelProps={{ class: 'fill-slate-400 text-xs font-medium', dx: AXIS_TICK_DX }}
						/>
						<Axis
							placement="bottom"
							rule={{ class: 'stroke-slate-700' }}
							format={(d) => d === 0 ? 'Start' : `GW${d}`}
							tickLabelProps={{ class: 'fill-slate-400 text-xs font-medium', dy: AXIS_TICK_DY }}
						/>

						{#each userLines as line (line.userId)}
							{@const isCurrent = line.userId === currentUserId}
							
							<!-- Line -->
							<Spline
								data={line.data}
								x="week"
								y="points"
								stroke={line.color}
								strokeWidth={isCurrent ? STROKE_WIDTH_CURRENT : STROKE_WIDTH_DEFAULT}
								curve={curveLinear}
								class="transition-all duration-200"
								style="opacity: {isCurrent ? OPACITY_CURRENT : OPACITY_DEFAULT}"
							/>
							
							<!-- Points (dots) -->
							{#if isCurrent}
								<Points
									data={line.data}
									x="week"
									y="points"
									fill={line.color}
									r={POINT_RADIUS}
									class="transition-all duration-200"
								/>
							{/if}
						{/each}

						<Highlight
							points
							lines={{ class: 'stroke-slate-400/50 stroke-dasharray-2' }}
						/>
					</Svg>

					<Tooltip.Root>
						{#snippet children({ data })}
							{@const sortedUsers = [...displayedUsers].sort((a, b) => {
								const pointsA = data[a.userId] ?? -1;
								const pointsB = data[b.userId] ?? -1;
								return pointsB - pointsA;
							})}
							<Tooltip.Header>
								{data.week === 0 ? 'Start' : `Gameweek ${data.week}`}
							</Tooltip.Header>
							<Tooltip.List>
								{#each sortedUsers as user}
									{#if data[user.userId] !== undefined}
										<Tooltip.Item
											label={user.username}
											value="{data[user.userId]} pts {data[`${user.userId}_weekly`] > 0 ? `(+${data[`${user.userId}_weekly`]})` : ''}"
											color={user.color}
										/>
									{/if}
								{/each}
							</Tooltip.List>
						{/snippet}
					</Tooltip.Root>
				</Chart>
			{:else}
				<div class="flex h-full flex-col items-center justify-center text-slate-400">
					<Trophy class="mb-3 h-12 w-12 opacity-30" />
					<p class="text-lg font-medium">No ranking data available yet</p>
					<p class="mt-1 text-sm text-slate-500">Rankings will appear after gameweek results are processed</p>
				</div>
			{/if}
		</div>
	</div>
</div>
