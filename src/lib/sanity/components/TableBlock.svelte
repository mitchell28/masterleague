<script lang="ts">
	interface TableValue {
		caption?: string;
		rows: {
			cells: string[];
		}[];
	}

	interface Props {
		value: TableValue;
	}

	let { value }: Props = $props();
</script>

<div class="my-8">
	{#if value.caption}
		<div class="mb-4 text-center">
			<h3 class="text-accent text-lg font-medium">{value.caption}</h3>
		</div>
	{/if}

	<div class="overflow-x-auto rounded-lg border border-purple-500/20 bg-slate-800/30">
		<table class="w-full">
			<tbody>
				{#each value.rows as row, rowIndex}
					<tr class="border-b border-purple-500/10 last:border-b-0">
						{#each row.cells as cell, cellIndex}
							{#if rowIndex === 0}
								<!-- Header row -->
								<th
									class="text-accent bg-slate-700/30 px-4 py-3 text-left font-medium first:rounded-tl-lg last:rounded-tr-lg"
								>
									{cell}
								</th>
							{:else}
								<!-- Data row -->
								<td class="px-4 py-3 text-white/90">
									{cell}
								</td>
							{/if}
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	table {
		border-collapse: collapse;
	}

	th {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(219, 39, 119, 0.1) 100%);
	}

	tr:hover td {
		background-color: rgba(139, 92, 246, 0.05);
	}

	tr:nth-child(even) td {
		background-color: rgba(0, 0, 0, 0.1);
	}
</style>
