import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright end-to-end configuration for pki-toolbox.
 *
 * The app is a fully static SvelteKit build (adapter-static, prerender=true):
 * every route is rendered to `<route>.html` under ./build and served by nginx
 * in production. The e2e suite exercises that exact static output, so the
 * webServer below builds the site and serves it with Vite's preview server
 * (the same artefact nginx would serve), then waits for its URL to be ready.
 *
 * Decoding is 100% client-side (WebCrypto / @peculiar/x509 / pkijs) and the CSP
 * denies all network egress (connect-src 'none'), so no backend is needed.
 *
 * Tooling has no Node on the host and runs inside a container; in CI, use the
 * official Playwright image (Debian) — Alpine is not supported by the browser
 * binaries — and run `pnpm exec playwright test`, which picks up this config.
 */

const PORT = 4173;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: './e2e',

	// Fail the CI build if a `test.only` is committed by accident.
	forbidOnly: !!process.env.CI,

	// Retries only in CI; locally a failure is a failure.
	retries: process.env.CI ? 2 : 0,

	// Serialize on CI for stable, reproducible runs; parallel locally.
	workers: process.env.CI ? 1 : undefined,
	fullyParallel: true,

	// html for humans, junit for the GitLab "Tests" tab (reports.junit).
	reporter: [
		['html', { open: 'never' }],
		['junit', { outputFile: 'junit.xml' }],
		['list']
	],

	use: {
		baseURL,
		// Capture a trace only when a test is retried, to keep artefacts small.
		trace: 'on-first-retry',
		// Screenshot only when a test fails.
		screenshot: 'only-on-failure'
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
		// Uncomment to broaden browser coverage:
		// {
		// 	name: 'firefox',
		// 	use: { ...devices['Desktop Firefox'] }
		// },
		// {
		// 	name: 'webkit',
		// 	use: { ...devices['Desktop Safari'] }
		// }
	],

	/**
	 * Build the static site, then serve ./build with Vite's preview server.
	 * Playwright waits until `url` responds before starting the tests.
	 * Locally an already-running preview server is reused; in CI a fresh one
	 * is always started (reuseExistingServer: false).
	 */
	webServer: {
		command: `pnpm build && pnpm preview --port ${PORT}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
