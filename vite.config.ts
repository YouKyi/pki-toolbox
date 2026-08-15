import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		// Artefacts de sortie : les surveiller fait recharger le dev server en
		// boucle dès qu'un build ou une campagne Playwright tourne en parallèle.
		watch: { ignored: ['**/build/**', '**/test-results/**', '**/playwright-report/**'] }
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['tests/**/*.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
