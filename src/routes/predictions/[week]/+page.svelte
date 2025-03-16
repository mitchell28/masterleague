<!-- Import exact same component but use dynamic routing -->
<script lang="ts">
	import PredictionsPage from '../+page.svelte';
	import { page } from '$app/state';

	// Get data from the page store using derived values
	let data = $derived(page.data);
	let form = $derived(page.form);
</script>

<!-- Pass all properties directly to avoid type errors -->
<PredictionsPage
	data={{
		fixtures: data.fixtures,
		teams: data.teams,
		week: data.week,
		weeks: data.weeks,
		currentWeek: data.currentWeek,
		predictions: data.predictions
	}}
	{form}
/>
