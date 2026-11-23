import { expect, type Page, type Locator } from '@playwright/test';

/**
 * Helpers shared by the decoder and flow suites.
 *
 * A prerendered page shows its buttons before it can act on them: a click
 * that lands before hydration is silently lost. The root layout marks
 * `<html data-hydrated>` once the page is live, and `open` waits for it, so a
 * test clicks once and a lost click is a real failure, not a retry.
 */

/** Navigates to `path` and waits until the page is hydrated. */
export async function open(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
}

/** The per-page `#result` output region every tool renders into. */
export function region(page: Page): Locator {
	return page.locator('#result');
}

export function input(page: Page): Locator {
	return page.getByLabel('PKI artefact input');
}

/** The site navigation, so a tool link never collides with the home grid. */
export function nav(page: Page): Locator {
	return page.getByRole('navigation', { name: 'Primary' });
}

/** Loads the page example; the page must already be open. */
export async function loadExample(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Load an example' }).click();
	await expect(input(page)).not.toHaveValue('');
}

/** The DER bytes of a single armoured block. */
export function derOf(pem: string): Buffer {
	return Buffer.from(pem.replace(/-----[^-]+-----|\s/g, ''), 'base64');
}

/** DER armoured exactly as the app writes it: 64-column base64. */
export function armour(der: Buffer, label = 'CERTIFICATE'): string {
	const lines = der.toString('base64').match(/.{1,64}/g) ?? [];
	return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}
