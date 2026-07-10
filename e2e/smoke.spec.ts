import { test, expect } from '@playwright/test';

/**
 * Smoke suite for pki-toolbox — fast health check of the REAL static build
 * served by `pnpm preview` (adapter-static, prerender=true; see
 * playwright.config.ts). Covers the shell: home render, the first-load loader,
 * navigation, and theme persistence. Feature coverage lives in tools.spec.ts.
 *
 * Selectors are functional contracts only (roles / accessible names / visible
 * text / the `#yk-loader` node / the `.dark` & `.yk-ready` <html> classes). No
 * reliance on Tailwind/DA classes or colours, which change with the design.
 *
 * Loader nuance (app.html): each Playwright test gets a fresh context, so
 * sessionStorage is empty and the first `goto` behaves like the session's first
 * load — `#yk-loader` is shown then REMOVED from the DOM (no `html.yk-ready`). A
 * second full document load in the same context hits the sessionStorage flag, so
 * `html.yk-ready` is applied before paint and the loader stays but is hidden via
 * CSS. S2 exercises both paths.
 */

test('S1 home renders, loader removed on first load, title set', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle(/PKI-Toolbox/i);
	await expect(page.getByRole('heading', { name: 'PKI toolbox', level: 1 })).toBeVisible();

	// First load of the session: the loader is removed from the DOM after fade.
	await expect(page.locator('#yk-loader')).toHaveCount(0);

	// A couple of the ten "ready" tool cards must be present (nav links).
	await expect(page.getByRole('link', { name: 'Certificate decoder' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Self-signed certificate' })).toBeVisible();

	await expect(page.getByText('100% client-side, no data sent')).toBeVisible();
});

test('S2 navigate home → tool → home, yk-ready on a second load', async ({ page }) => {
	await page.goto('/');

	// Navigate via the home card (robust, unlike the hover-driven desktop menu).
	await page.getByRole('link', { name: 'Certificate decoder' }).click();
	await expect(page).toHaveURL(/\/decode-certificate$/);
	await expect(page.getByRole('heading', { name: 'Certificate decoder', level: 1 })).toBeVisible();

	// Back home via the wordmark (accessible name contains "pki-toolbox_").
	await page
		.getByRole('link', { name: /pki-toolbox/i })
		.first()
		.click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { name: 'PKI toolbox', level: 1 })).toBeVisible();

	// Second FULL document load in the same context: the sessionStorage flag is
	// set, so html.yk-ready is applied before paint and the loader is kept in the
	// DOM but hidden by CSS (`html.yk-ready #yk-loader { display: none }`).
	await page.goto('/decode-certificate');
	await expect(page.locator('html')).toHaveClass(/yk-ready/);
	await expect(page.locator('#yk-loader')).toHaveCount(1);
	await expect(page.locator('#yk-loader')).toBeHidden();
});

test('S3 theme toggle persists across reload (pre-paint head script)', async ({ page }) => {
	await page.goto('/');

	// Light by default (no .dark on <html>).
	await expect(page.locator('html')).not.toHaveClass(/dark/);
	const toggle = page.getByRole('button', { name: /Switch to (dark|light) theme/ });
	await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();

	// Switch to dark: class flips, label flips, choice persisted to localStorage.
	await toggle.click();
	await expect(page.locator('html')).toHaveClass(/dark/);
	await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
	expect(await page.evaluate(() => localStorage.getItem('pki-toolbox-theme'))).toBe('dark');

	// The head pre-script re-applies .dark before hydration on reload.
	await page.reload();
	await expect(page.locator('html')).toHaveClass(/dark/);
});
