import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		include: ['@lucide/svelte', 'motion'],
		exclude: ['@vinejs/vine', '@fontsource-variable/work-sans']
	},
	build: {
		chunkSizeWarningLimit: 800,
		rollupOptions: {
			external: ['node:dns/promises', 'node:dns'],
			onwarn(warning, warn) {
				// Suppress "use client" directive warnings from React libraries
				if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) {
					return;
				}
				warn(warning);
			}
		}
	}
});
