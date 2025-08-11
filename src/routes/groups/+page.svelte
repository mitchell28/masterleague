<script lang="ts">
	import OrganizationsDashboard from '$lib/components/OrganizationsDashboard.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form } = $props<{ data: PageData; form?: ActionData }>();
</script>

<svelte:head>
	<title>Groups - Master League</title>
	<meta name="description" content="Manage your prediction groups" />
</svelte:head>

<div class="mx-auto mt-22">
	<!-- Main Header with clean geometric design -->
	<div class="relative">
		<div class="font-display mb-6 w-full overflow-hidden bg-slate-900">
			<div class="mx-auto my-6 max-w-6xl">
				<!-- Main content area -->
				<div class="relative flex h-full items-center justify-between px-4 py-4">
					<div>
						<h1 class="text-3xl font-bold text-white">Groups</h1>
						<div class="mt-2 flex items-center gap-3">
							<span class="text-sm font-medium text-slate-300">
								Create or join prediction groups
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl">
		<OrganizationsDashboard {form} />
	</div>
</div>
