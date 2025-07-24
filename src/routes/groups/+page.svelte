<script lang="ts">
	import GroupsDashboard from '$lib/components/GroupsDashboard.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Groups - Master League</title>
	<meta name="description" content="Manage your prediction groups and subscriptions" />
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8 pt-24">
	<header class="mb-8">
		<h1 class="text-3xl font-bold text-white">
			<span class="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
				Groups
			</span>
		</h1>
		<p class="text-slate-400">Create or join prediction groups and manage your subscriptions</p>
	</header>

	<GroupsDashboard />
</div>
