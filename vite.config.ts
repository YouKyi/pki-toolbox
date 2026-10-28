import adapter from '@sveltejs/adapter-static';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Fully static output served by nginx, no Node runtime in production.
			// Every route is prerendered (see +layout.ts), so no SPA fallback is
			// needed; nginx handles deep links via `try_files`.
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				precompress: false,
				strict: true
			}),

			// Content-Security-Policy is emitted by SvelteKit as a <meta> tag on every
			// prerendered page. `mode: 'hash'` hashes the inline hydration bootstrap
			// script so it is allowed without 'unsafe-inline'. nginx must NOT also send
			// a CSP header, or the browser would enforce the intersection and block it.
			// `frame-ancestors` cannot be set via <meta>, nginx keeps X-Frame-Options.
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					// The app is 100% client-side and makes no network requests; deny all.
					'connect-src': ['none'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self']
				}
			}
		})
	],
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
