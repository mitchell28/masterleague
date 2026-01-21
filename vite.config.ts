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
			external: [
				'node:dns/promises',
				'node:dns',
				'react',
				'react/jsx-runtime',
				'react-dom',
				'react-dom/client',
				'react-dom/server',
				'styled-components'
			],
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
