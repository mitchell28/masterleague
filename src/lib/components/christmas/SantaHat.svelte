<script lang="ts">
	let { class: className = '' } = $props();
</script>

<svg viewBox="0 0 100 100" class={className} fill="none" xmlns="http://www.w3.org/2000/svg">
	<!-- Hat Body -->
	<path d="M10 80 C 10 80, 40 10, 80 80" fill="#D42426" />
	<!-- Pom Pom -->
	<circle cx="80" cy="80" r="10" fill="white" />
	<!-- Brim -->
	<rect x="5" y="75" width="80" height="15" rx="5" fill="white" />
</svg>
