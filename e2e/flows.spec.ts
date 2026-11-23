import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test, expect, type Page, type Locator } from '@playwright/test';
import { TEST_EXPIRED, TEST_PKCS12 } from '../src/lib/samples';
import { decodePkcs7 } from '../src/lib/pki/pkcs7';
import { open, region, input, nav, loadExample, derOf, armour } from './live';

/**
 * What the reader does around a decode: the files they take away, the text
 * they copy, the wrong file they drop, the menus they navigate by. Every
 * download and copy is checked for its content, not only for its button.
 */

/** Clicks `button` and returns the downloaded file's name and bytes. */
async function download(page: Page, button: Locator): Promise<{ name: string; bytes: Buffer }> {
	const [file] = await Promise.all([page.waitForEvent('download'), button.click()]);
	return { name: file.suggestedFilename(), bytes: await readFile(await file.path()) };
}

// ---------------------------------------------------------------------------
// S21: the converter's downloads carry the converted bytes
// ---------------------------------------------------------------------------
test('S21 format conversion downloads PEM, DER and a PKCS#7 bundle', async ({ page }) => {
	await open(page, '/format-convert');
	await loadExample(page);
	const der = derOf(await input(page).inputValue());
	await page.getByRole('button', { name: 'Convert' }).click();

	const result = region(page);
	const buttons = result.getByRole('button', { name: 'Download', exact: true });

	const pemFile = await download(page, buttons.nth(0));
	expect(pemFile.name).toBe('certificate-1.pem');
	expect(pemFile.bytes.toString()).toBe(armour(der));

	const derFile = await download(page, buttons.nth(1));
	expect(derFile.name).toBe('certificate-1.der');
	expect(derFile.bytes.equals(der)).toBe(true);

	const hexFile = await download(page, buttons.nth(2));
	expect(hexFile.name).toBe('certificate-1.hex.txt');
	// Colon-grouped uppercase pairs, exactly: no stray characters filtered away.
	expect(hexFile.bytes.toString()).toBe(
		(der.toString('hex').toUpperCase().match(/../g) ?? []).join(':')
	);

	// Decoded back, the bundle holds exactly the converted certificate.
	const p7b = await download(page, result.getByRole('button', { name: /Download as PKCS#7/ }));
	expect(p7b.name).toBe('bundle.p7b');
	const bundle = await decodePkcs7(armour(p7b.bytes, 'PKCS7'));
	expect(bundle.certificates.map((c) => c.fingerprints.sha256)).toEqual([
		createHash('sha256').update(der).digest('hex')
	]);
});

// ---------------------------------------------------------------------------
// S22: a copy button puts the exact text on the clipboard
// ---------------------------------------------------------------------------
test('S22 copy puts the PEM on the clipboard', async ({ page, context, browserName }) => {
	// Reading the clipboard back needs a granted permission, which Playwright
	// supports on Chromium only; Firefox and WebKit reject the grant itself.
	test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only in Playwright');
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await open(page, '/format-convert');
	await loadExample(page);
	const der = derOf(await input(page).inputValue());
	await page.getByRole('button', { name: 'Convert' }).click();

	// A sentinel first, so a PEM already on the clipboard cannot pass for the copy.
	await page.evaluate(() => navigator.clipboard.writeText('sentinel'));
	await region(page).getByRole('button', { name: 'Copy' }).first().click();
	// The acknowledgement first: it fades after 1.2 s, so it is checked before
	// anything that could take time, and the clipboard content after it.
	await expect(region(page).getByRole('button', { name: 'Copied' })).toBeVisible();
	await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(armour(der));
});

// ---------------------------------------------------------------------------
// S23: an expired certificate says so before anything else
// ---------------------------------------------------------------------------
test('S23 an expired certificate is answered as expired', async ({ page }) => {
	await open(page, '/decode-certificate');
	await loadExample(page);
	await input(page).fill(TEST_EXPIRED);
	await page.getByRole('button', { name: 'Decode' }).click();

	const result = region(page);
	await expect(result.getByText('Expired', { exact: true }).first()).toBeVisible();
	await expect(result.getByText(/days ago/)).toBeVisible();
	await expect(result.getByText('Valid', { exact: true })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// S24: a keystore dropped on the certificate decoder is sent where it belongs
// ---------------------------------------------------------------------------
test('S24 a .p12 imported in the certificate decoder routes to the PKCS#12 decoder', async ({
	page
}) => {
	await open(page, '/decode-certificate');
	await loadExample(page);
	await page.getByRole('button', { name: 'Clear', exact: true }).click();

	const p12 = Buffer.from(TEST_PKCS12.replace(/\s/g, ''), 'base64');
	await page
		.getByLabel('Import a PKI file')
		.setInputFiles({ name: 'store.p12', mimeType: 'application/x-pkcs12', buffer: p12 });

	// Not armoured as a certificate: the box stays empty and the file is named.
	await expect(page.getByText('This file belongs to another tool')).toBeVisible();
	await expect(page.getByText(/This looks like a PKCS#12 keystore/)).toBeVisible();
	await expect(input(page)).toHaveValue('');

	await page.getByRole('button', { name: 'Open it there' }).click();
	await expect(page).toHaveURL(/\/decode-pkcs12$/);
	await expect(input(page)).toHaveValue(p12.toString('base64'));
	expect(new URL(page.url()).search).toBe('');
});

// ---------------------------------------------------------------------------
// S25: a file over the size limit is refused before it is read
// ---------------------------------------------------------------------------
test('S25 an oversized file is refused with the limit stated', async ({ page }) => {
	await open(page, '/asn1-viewer');
	await loadExample(page);
	await page.getByRole('button', { name: 'Clear', exact: true }).click();

	await page.getByLabel('Import a PKI file').setInputFiles({
		name: 'huge.der',
		mimeType: 'application/octet-stream',
		buffer: Buffer.alloc(4 * 1024 * 1024 + 1, 0x30)
	});
	await expect(page.getByText('File too large (limit: 4 MB).')).toBeVisible();
	await expect(input(page)).toHaveValue('');
	await expect(input(page)).toHaveAttribute('aria-invalid', 'true');
});

// ---------------------------------------------------------------------------
// S26: every tool is reachable from the menus, on desktop and on a phone
// ---------------------------------------------------------------------------
test('S26 the desktop menu opens a tool', async ({ page }) => {
	await open(page, '/');
	await page.getByRole('button', { name: 'Decoding' }).click();
	await nav(page)
		.getByRole('link', { name: /CRL decoder/ })
		.click();
	await expect(page).toHaveURL(/\/decode-crl$/);
	await expect(page.getByRole('heading', { name: 'CRL decoder', level: 1 })).toBeVisible();
});

test('S26b the mobile menu opens a tool and closes behind it', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await open(page, '/');
	await page.getByRole('button', { name: 'Open menu' }).click();
	await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
	await nav(page)
		.getByRole('link', { name: /ASN\.1 viewer/ })
		.click();
	await expect(page).toHaveURL(/\/asn1-viewer$/);
	await expect(page.getByRole('heading', { name: 'ASN.1 viewer', level: 1 })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
});
