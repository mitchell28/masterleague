<script lang="ts">
	import OrganizationsDashboard from '$lib/components/OrganizationsDashboard.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Organizations - Master League</title>
	<meta name="description" content="Manage your prediction organizations and subscriptions" />
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8 pt-24">
	<header class="mb-8">
		<h1 class="text-3xl font-bold text-white">
			<span class="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
				Organizations
			</span>
		</h1>
		<p class="text-slate-400">
			Create or join prediction organizations and manage your subscriptions
		</p>
	</header>

	<OrganizationsDashboard />
</div>
