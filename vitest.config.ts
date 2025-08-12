import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['node_modules', 'dist', '.svelte-kit'],
		env: {
			NODE_ENV: 'test'
		},
		coverage: {
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', '**/coverage/**']
		},
		testTimeout: 10000,
		hookTimeout: 10000,
		pool: 'threads',
		poolOptions: {
			threads: {
				singleThread: true
			}
		}
	}
});
