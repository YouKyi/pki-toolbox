import { test, expect } from '@playwright/test';

/**
 * Smoke suite for pki-toolbox — fast health check of the REAL static build
 * served by `pnpm preview` (adapter-static, prerender=true; see
 * playwright.config.ts). Covers the shell: home render, navigation, and theme
 * persistence. Feature coverage lives in tools.spec.ts.
 *
 * Selectors are functional contracts only (roles / accessible names / visible
 * text / the `.dark` <html> class). No reliance on Tailwind/DA classes or
 * colours, which change with the design.
 *
 * There is deliberately no loading screen to assert: the site is prerendered
 * and paints on the first frame, so nothing may gate the content behind a
 * timer. S1 asserts the shell is present immediately.
 */

test('S1 home renders with content on the first frame, title set', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle(/PKI-Toolbox/i);
	await expect(page.getByRole('heading', { name: 'PKI toolbox', level: 1 })).toBeVisible();

	// No splash may cover the page: nothing fixed and full-viewport on top.
	expect(
		await page.evaluate(() =>
			Array.from(document.body.querySelectorAll('*')).some((el) => {
				const s = getComputedStyle(el as HTMLElement);
				return (
					s.position === 'fixed' &&
					(el as HTMLElement).clientHeight >= window.innerHeight &&
					s.visibility !== 'hidden' &&
					s.display !== 'none'
				);
			})
		)
	).toBe(false);

	// A couple of the ten "ready" tool cards must be present (nav links).
	await expect(page.getByRole('link', { name: 'Certificate decoder' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Self-signed certificate' })).toBeVisible();

	await expect(page.getByText('100% client-side, no data sent')).toBeVisible();
});

test('S2 navigate home → tool → home, then a second full document load', async ({ page }) => {
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

	// A second FULL document load lands directly on the tool, with no gate.
	await page.goto('/decode-certificate');
	await expect(page.getByRole('heading', { name: 'Certificate decoder', level: 1 })).toBeVisible();
	await expect(page.getByLabel('PKI artefact input')).toBeVisible();
});

test('S3 theme follows the OS until the reader chooses', async ({ page }) => {
	// An unset preference follows the operating system, so the test has to state
	// which system it is standing in rather than assume light.
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');
	await expect(page.locator('html')).toHaveClass(/dark/);
	expect(await page.evaluate(() => localStorage.getItem('pki-toolbox-theme'))).toBeNull();

	// The OS changing mid-session moves the page with it, while no explicit
	// choice exists.
	await page.emulateMedia({ colorScheme: 'light' });
	await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('S3b an explicit choice outranks the OS and survives a reload', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/');

	// Light, because the OS says so and nothing was chosen yet.
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

	// And the OS flipping the other way no longer overrides that choice.
	await page.emulateMedia({ colorScheme: 'light' });
	await expect(page.locator('html')).toHaveClass(/dark/);
});
