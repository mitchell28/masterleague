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
	<!-- Main Header with clean geometric design and mobile responsive layout -->
	<div class="relative mb-4 sm:mb-6">
		<div class="font-display w-full overflow-hidden bg-slate-900">
			<!-- Main Header Content -->
			<div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
				<!-- Mobile Layout: Centered -->
				<div class="text-center sm:text-left">
					<h1 class="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">Groups</h1>
					<div class="mt-2 flex items-center justify-center gap-3 sm:justify-start">
						<span class="text-xs font-medium text-slate-300 sm:text-sm">
							Create or join prediction groups
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-4 sm:px-6">
		<OrganizationsDashboard {form} />
	</div>
</div>
