import { test, expect } from '@playwright/test';
import { open, region, input, loadExample, derOf, armour } from './live';

/**
 * The decoders tools.spec.ts does not reach (CRL, PKCS#7, PKCS#12, ASN.1), plus
 * the input paths every decoder shares: a binary file import, an empty file,
 * the keyboard shortcut and a paste that does not parse. Same rules as
 * tools.spec.ts: content assertions are scoped to the `#result` region.
 */

/** A run of base64 long enough to be key material rather than a label or a name. */
const BASE64_RUN = /[A-Za-z0-9+/]{60,}/;

// ---------------------------------------------------------------------------
// S15: CRL decoder via "Load an example" (TEST_CRL)
// ---------------------------------------------------------------------------
test('S15 decode CRL example', async ({ page }) => {
	// Inside the sample's window (issued 2026-05-19, next update 2036-05-16
	// 08:05:04Z), so freshness does not depend on the day the suite runs.
	await page.clock.setFixedTime(new Date('2030-01-01T00:00:00Z'));
	await open(page, '/decode-crl');
	await loadExample(page);
	await page.getByRole('button', { name: 'Decode the CRL' }).click();

	const result = region(page);

	// The band names the issuer by its CN and answers freshness first.
	await expect(
		result.getByRole('heading', { name: 'pki-toolbox Test CA', level: 2 })
	).toBeVisible();
	await expect(result.getByText('Current', { exact: true })).toBeVisible();
	await expect(result.getByText('(in 2,327 days)')).toBeVisible();
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
	await open(page, '/decode-pkcs7');
	await loadExample(page);
	await page.getByRole('button', { name: 'Decode the bundle' }).click();

	const result = region(page);

	await expect(result.getByRole('heading', { name: 'PKCS#7 bundle', level: 2 })).toBeVisible();
	await expect(result.getByText('PKCS#7 SignedData', { exact: true })).toBeVisible();
	// One CertCard per embedded certificate, and two distinct ones: the leaf
	// and the CA that issued it, not the same card twice.
	await expect(result.getByRole('heading', { name: 'Identity' })).toHaveCount(2);
	await expect(
		result.getByRole('heading', { level: 2, name: /demo\.pki-toolbox\.test$/ })
	).toHaveCount(1);
	await expect(result.getByRole('heading', { level: 2, name: /pki-toolbox Test CA$/ })).toHaveCount(
		1
	);
});

// ---------------------------------------------------------------------------
// S17: PKCS#12, a wrong password first, then the right one
// ---------------------------------------------------------------------------
test('S17 decrypt PKCS#12 example, wrong password then right', async ({ page }) => {
	await open(page, '/decode-pkcs12');
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
	// The key is listed by its metadata, and nothing else: name, algorithm,
	// whether it is encrypted.
	const keys = result.getByRole('heading', { name: 'Private keys' }).locator('..');
	await expect(keys.getByRole('listitem')).toHaveCount(1);
	await expect(keys.getByRole('listitem')).toHaveText(
		/^\s*demo\.pki-toolbox\.test\s*EC\s*encrypted\s*$/
	);
	await expect(keys.getByText('Private key material is never displayed.')).toBeVisible();
	// No key bytes anywhere in the answer, armoured or bare. Tested as a boolean
	// so a failure never prints the bytes it found into the report.
	const shown = await result.innerText();
	expect(BASE64_RUN.test(shown), 'a base64 run is displayed in the result').toBe(false);
	expect(
		/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(shown),
		'an armoured key is displayed in the result'
	).toBe(false);
});

// ---------------------------------------------------------------------------
// S18: ASN.1 viewer, parse then fold and unfold a node
// ---------------------------------------------------------------------------
test('S18 ASN.1 viewer parses and folds the tree', async ({ page }) => {
	await open(page, '/asn1-viewer');
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
	await open(page, '/decode-certificate');
	await loadExample(page);
	const der = derOf(await input(page).inputValue());
	await page.getByRole('button', { name: 'Clear', exact: true }).click();

	const picker = page.getByLabel('Import a PKI file');

	await picker.setInputFiles({
		name: 'empty.cer',
		mimeType: 'application/pkix-cert',
		buffer: Buffer.alloc(0)
	});
	await expect(page.getByText('The file is empty.')).toBeVisible();

	await picker.setInputFiles({ name: 'root.cer', mimeType: 'application/pkix-cert', buffer: der });
	await expect(input(page)).toHaveValue(armour(der));
	await expect(page.getByText('The file is empty.')).toHaveCount(0);

	await input(page).press('ControlOrMeta+Enter');
	await expect(region(page).getByRole('heading', { name: 'ISRG Root X1', level: 2 })).toBeVisible();
});

// ---------------------------------------------------------------------------
// S20: a paste that does not parse fails loudly and keeps the editor open
// ---------------------------------------------------------------------------
test('S20 garbage input fails with the tool label and no result', async ({ page }) => {
	await open(page, '/asn1-viewer');
	await input(page).fill('this is not a PKI artefact');
	await page.getByRole('button', { name: 'Parse' }).click();

	const result = region(page);
	await expect(result.getByText('Parsing failed', { exact: true })).toBeVisible();
	await expect(input(page)).toBeVisible();
	await expect(input(page)).toHaveAttribute('aria-invalid', 'true');
	await expect(page.getByRole('button', { name: 'Edit input' })).toHaveCount(0);
	await expect(result.getByRole('button', { name: /SEQUENCE/ })).toHaveCount(0);
});
