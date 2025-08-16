import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(() => {
	return {
		plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
		optimizeDeps: {
			include: ['@lucide/svelte', 'motion'],
			exclude: ['@vinejs/vine']
		},
		build: {
			commonjsOptions: {
				ignoreTryCatch: false
			},
			rollupOptions: {
				external: ['node:dns/promises', 'node:dns'],
				onwarn(warning, warn) {
					// Suppress the specific motion animate warning since we know it's used
					if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.message?.includes('motion')) {
						return;
					}
					warn(warning);
				}
			}
		},
		ssr: {
			noExternal: ['@vinejs/vine', 'motion'],
			external: ['node:dns/promises', 'node:dns']
		}
	};
});
