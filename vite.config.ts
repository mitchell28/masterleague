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
			chunkSizeWarningLimit: 2000, // Increase limit to 2000kB to reduce warnings for large Sanity chunks
			rollupOptions: {
				external: ['node:dns/promises', 'node:dns'],
				output: {
					manualChunks: (id) => {
						// Only split very specific large packages to avoid dependency issues
						if (id.includes('node_modules')) {
							// Split Sanity-related packages only
							if (id.includes('@sanity') || id.includes('sanity/')) {
								return 'sanity';
							}
							// Split Lucide icons
							if (id.includes('@lucide')) {
								return 'lucide';
							}
						}
					}
				},
				onwarn(warning, warn) {
					// Suppress the specific motion animate warning since we know it's used
					if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.message?.includes('motion')) {
						return;
					}
					// Suppress false positive renderStudio warning - it is actually used
					if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.message?.includes('renderStudio')) {
						return;
					}
					// Suppress "use client" directive warnings from React libraries in SSR builds
					if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message?.includes('use client')) {
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
