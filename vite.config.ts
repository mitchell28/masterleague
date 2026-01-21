import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	optimizeDeps: {
		include: ['@lucide/svelte', 'motion'],
		exclude: ['@vinejs/vine', '@fontsource-variable/work-sans']
	},
	build: {
		chunkSizeWarningLimit: 800, // More conservative limit
		rollupOptions: {
			external: ['node:dns/promises', 'node:dns', 'react']
		}
	}
});
