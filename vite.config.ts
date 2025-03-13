import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Load environment variables based on mode
	const env = loadEnv(mode, process.cwd(), '');

	return {
		plugins: [sveltekit(), tailwindcss()],
		// Make Vite aware of environment variables
		define: {
			'process.env.BETTER_AUTH_URL': JSON.stringify(env.BETTER_AUTH_URL)
		}
	};
});
