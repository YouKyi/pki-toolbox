import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * The decoders tools.spec.ts does not reach (CRL, PKCS#7, PKCS#12, ASN.1), plus
 * the input paths every decoder shares: a binary file import, an empty file,
 * the keyboard shortcut and a paste that does not parse. Same rules as
 * tools.spec.ts: content assertions are scoped to the `#result` region.
 */

function region(page: Page): Locator {
	return page.locator('#result');
}

function input(page: Page): Locator {
	return page.getByLabel('PKI artefact input');
}

/**
 * Loads the page example, retrying until it lands. A click that reaches the
 * prerendered button before hydration is silently lost, so the box filling is
 * also the proof that the page is live.
 */
async function loadExample(page: Page): Promise<void> {
	await expect(async () => {
		await page.getByRole('button', { name: 'Load an example' }).click();
		await expect(input(page)).not.toHaveValue('', { timeout: 1_000 });
	}).toPass();
}

// ---------------------------------------------------------------------------
// S15: CRL decoder via "Load an example" (TEST_CRL)
// ---------------------------------------------------------------------------
test('S15 decode CRL example', async ({ page }) => {
	await page.goto('/decode-crl');
	await loadExample(page);
	await page.getByRole('button', { name: 'Decode the CRL' }).click();

	const result = region(page);

	// The band names the issuer by its CN and answers freshness first.
	await expect(
		result.getByRole('heading', { name: 'pki-toolbox Test CA', level: 2 })
	).toBeVisible();
	await expect(result.getByText('Current', { exact: true })).toBeVisible();
	await expect(result.getByText(/1 revoked certificate · issued/)).toBeVisible();

	// One revoked entry, with its reason in words.
	await expect(result.getByRole('columnheader', { name: 'Reason' })).toBeVisible();
	await expect(result.getByRole('cell', { name: 'Key compromise' })).toBeVisible();

	await expect(input(page)).toBeHidden();
	await expect(page.getByRole('button', { name: 'Edit input' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// S16: PKCS#7 decoder via "Load an example" (TEST_PKCS7: leaf + CA)
// ---------------------------------------------------------------------------
test('S16 decode PKCS#7 example', async ({ page }) => {
	await page.goto('/decode-pkcs7');
	await loadExample(page);
	await page.getByRole('button', { name: 'Decode the bundle' }).click();

	const result = region(page);

	await expect(result.getByRole('heading', { name: 'PKCS#7 bundle', level: 2 })).toBeVisible();
	await expect(result.getByText('PKCS#7 SignedData', { exact: true })).toBeVisible();
	// One CertCard per embedded certificate.
	await expect(result.getByRole('heading', { name: 'Identity' })).toHaveCount(2);
	await expect(result.getByText('demo.pki-toolbox.test').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// S17: PKCS#12, a wrong password first, then the right one
// ---------------------------------------------------------------------------
test('S17 decrypt PKCS#12 example, wrong password then right', async ({ page }) => {
	await page.goto('/decode-pkcs12');
	await loadExample(page);
	const password = page.getByLabel('File password');
	await expect(password).not.toHaveValue('');
	const right = await password.inputValue();

	await password.fill('definitely-not-it');
	await page.getByRole('button', { name: 'Decrypt' }).click();

	const result = region(page);
	await expect(result.getByText('Decryption failed', { exact: true })).toBeVisible();
	await expect(
		result.getByText('Incorrect password, or invalid PKCS#12 file integrity.', { exact: true })
	).toBeVisible();
	// A failure keeps the editor open so the reader can fix the input.
	await expect(input(page)).toBeVisible();
	await expect(input(page)).toHaveAttribute('aria-invalid', 'true');

	await password.fill(right);
	await page.getByRole('button', { name: 'Decrypt' }).click();

	await expect(result.getByRole('heading', { name: 'PKCS#12 keystore', level: 2 })).toBeVisible();
	await expect(result.getByText('Decryption failed', { exact: true })).toHaveCount(0);
	await expect(result.getByText('MAC verified', { exact: true })).toBeVisible();
	await expect(result.getByText('2 certificates, 1 private key').first()).toBeVisible();
	await expect(result.getByRole('heading', { name: 'Private keys' })).toBeVisible();
	// The key is listed, never shown.
	await expect(result.getByText('Private key material is never displayed.')).toBeVisible();
	await expect(result.getByText(/BEGIN (ENCRYPTED )?PRIVATE KEY/)).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// S18: ASN.1 viewer, parse then fold and unfold a node
// ---------------------------------------------------------------------------
test('S18 ASN.1 viewer parses and folds the tree', async ({ page }) => {
	await page.goto('/asn1-viewer');
	await loadExample(page);
	await page.getByRole('button', { name: 'Parse' }).click();

	const result = region(page);

	// A certificate is a SEQUENCE of three: TBS, algorithm, signature.
	const root = result.getByRole('button', { name: /SEQUENCE\s*3 elements/ }).first();
	await expect(root).toHaveAttribute('aria-expanded', 'true');
	await expect(result.getByText('OBJECT IDENTIFIER').first()).toBeVisible();
	await expect(result.getByText('BIT STRING').first()).toBeVisible();

	await root.click();
	await expect(root).toHaveAttribute('aria-expanded', 'false');
	await expect(result.getByText('BIT STRING')).toHaveCount(0);

	await root.click();
	await expect(result.getByText('BIT STRING').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// S19: importing a binary DER file, an empty file, and Ctrl/⌘ + Enter
// ---------------------------------------------------------------------------
test('S19 a DER file is armoured on import and decodes from the keyboard', async ({ page }) => {
	await page.goto('/decode-certificate');
	await loadExample(page);
	const pem = await input(page).inputValue();
	const der = Buffer.from(pem.replace(/-----[^-]+-----|\s/g, ''), 'base64');
	await page.getByRole('button', { name: 'Clear', exact: true }).click();

	const picker = page.getByLabel('Import a PKI file');

	await picker.setInputFiles({
		name: 'empty.cer',
		mimeType: 'application/pkix-cert',
		buffer: Buffer.alloc(0)
	});
	await expect(page.getByText('The file is empty.')).toBeVisible();

	await picker.setInputFiles({ name: 'root.cer', mimeType: 'application/pkix-cert', buffer: der });
	await expect(input(page)).toHaveValue(/^-----BEGIN CERTIFICATE-----/);
	await expect(page.getByText('The file is empty.')).toHaveCount(0);

	await input(page).press('ControlOrMeta+Enter');
	await expect(region(page).getByRole('heading', { name: 'ISRG Root X1', level: 2 })).toBeVisible();
});

// ---------------------------------------------------------------------------
// S20: a paste that does not parse fails loudly and keeps the editor open
// ---------------------------------------------------------------------------
test('S20 garbage input fails with the tool label and no result', async ({ page }) => {
	await page.goto('/asn1-viewer');
	await loadExample(page);
	await input(page).fill('this is not a PKI artefact');
	await page.getByRole('button', { name: 'Parse' }).click();

	const result = region(page);
	await expect(result.getByText('Parsing failed', { exact: true })).toBeVisible();
	await expect(input(page)).toBeVisible();
	await expect(input(page)).toHaveAttribute('aria-invalid', 'true');
	await expect(page.getByRole('button', { name: 'Edit input' })).toHaveCount(0);
	await expect(result.getByRole('button', { name: /SEQUENCE/ })).toHaveCount(0);
});
