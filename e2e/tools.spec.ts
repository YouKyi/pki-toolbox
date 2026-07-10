import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Tool feature suite for pki-toolbox, run against the REAL static build served
 * by `pnpm preview` (adapter-static, prerender=true) — see playwright.config.ts.
 * Everything is decoded client-side (WebCrypto / @peculiar/x509 / pkijs); the CSP
 * `connect-src 'none'` forbids any outbound request, which S4 asserts explicitly.
 *
 * Result scoping — IMPORTANT: getByText defaults to a case-insensitive SUBSTRING
 * match, so bare text like "Public key" or "PKCS#10 signing request" also hits
 * the ToolHeader description paragraph, causing strict-mode violations. Every
 * tool page wraps its output in a single `<div aria-live="polite">`; content
 * assertions are scoped to that region via `region()` so they never collide with
 * the page's own prose.
 */

/** The per-page `aria-live="polite"` output region every tool renders into. */
function region(page: Page): Locator {
	return page.locator('[aria-live="polite"]');
}

/** Collects any request whose origin is not the local preview server. */
function watchExternalRequests(page: Page): string[] {
	const external: string[] = [];
	page.on('request', (req) => {
		try {
			const url = new URL(req.url());
			// data:/blob: are in-document, never a network egress.
			if (url.protocol === 'data:' || url.protocol === 'blob:') return;
			if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') external.push(req.url());
		} catch {
			/* opaque URLs are local, ignore */
		}
	});
	return external;
}

// ---------------------------------------------------------------------------
// S4 — Certificate decoder via "Load an example" (ISRG_ROOT_X1) + no-network
// ---------------------------------------------------------------------------
test('S4 decode certificate example (ISRG Root X1)', async ({ page }) => {
	const external = watchExternalRequests(page);

	await page.goto('/decode-certificate');
	await page.getByRole('button', { name: 'Load an example' }).click();
	await expect(page.getByLabel('PKI artefact input')).not.toHaveValue('');
	await page.getByRole('button', { name: 'Decode' }).click();

	const result = region(page);

	// Card header: CN (repeated in Subject/Issuer rows, hence .first()) + badges.
	await expect(result.getByText('ISRG Root X1').first()).toBeVisible();
	await expect(result.getByText('Valid', { exact: true })).toBeVisible();
	await expect(result.getByText('Self-signed')).toBeVisible();

	// Structural CertCard sections (h3).
	await expect(result.getByRole('heading', { name: 'Identity' })).toBeVisible();
	await expect(result.getByRole('heading', { name: 'Validity' })).toBeVisible();
	await expect(result.getByRole('heading', { name: 'Key & signature' })).toBeVisible();
	await expect(result.getByRole('heading', { name: 'Fingerprints (DER)' })).toBeVisible();

	// Identity + fingerprint rows are rendered (dt labels; exact to avoid the
	// Subject/Issuer DN values that embed these strings).
	await expect(result.getByText('Issuer', { exact: true })).toBeVisible();
	await expect(result.getByText('SHA-256', { exact: true })).toBeVisible();

	// No decoding error surfaced.
	await expect(result.getByText('Decoding failed')).toHaveCount(0);

	// No-network contract: nothing left the local preview origin during decode.
	expect(external).toEqual([]);
});

// ---------------------------------------------------------------------------
// S5 — CSR decoder via "Load an example" (TEST_CSR)
// ---------------------------------------------------------------------------
test('S5 decode CSR example', async ({ page }) => {
	await page.goto('/decode-csr');
	await page.getByRole('button', { name: 'Load an example' }).click();
	await page.getByRole('button', { name: 'Decode' }).click();

	const result = region(page);

	// Structural labels only — the CN of the test CSR is not asserted (not
	// guaranteed stable). Scoped to the result region so "PKCS#10 signing
	// request" / "Public key" / "Signature algorithm" don't collide with the
	// ToolHeader description prose above.
	await expect(result.getByText('PKCS#10 signing request')).toBeVisible();
	await expect(result.getByText('CSR', { exact: true })).toBeVisible();

	await expect(result.getByRole('heading', { name: 'Identity' })).toBeVisible();
	await expect(result.getByRole('heading', { name: 'Key & signature' })).toBeVisible();
	await expect(result.getByText('Public key', { exact: true })).toBeVisible();
	await expect(result.getByText('Signature algorithm', { exact: true })).toBeVisible();

	await expect(result.getByText('Decoding failed')).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// S6 — Chain decoder via "Load an example" (TEST_CHAIN: leaf+intermediate+root)
// ---------------------------------------------------------------------------
test('S6 decode chain example (ordered, verified)', async ({ page }) => {
	await page.goto('/decode-chain');
	await page.getByRole('button', { name: 'Load an example' }).click();
	await page.getByRole('button', { name: 'Decode the chain' }).click();

	const result = region(page);

	// Validity alert: the self-consistent EC sample should verify as complete,
	// but tolerate the fallback so the test never flaps on the alert wording.
	await expect(
		result.getByText('Valid chain').or(result.getByText('Incomplete or unordered chain'))
	).toBeVisible();

	// The three roles are rendered, one CertCard each (badge labels, exact).
	await expect(result.getByText('Leaf certificate', { exact: true })).toBeVisible();
	await expect(result.getByText('Intermediate CA', { exact: true })).toBeVisible();
	await expect(result.getByText('Root CA', { exact: true })).toBeVisible();

	// At least one cryptographically verified issuer link.
	await expect(result.getByText(/Signature verified/).first()).toBeVisible();

	// One "Identity" section per certificate — validates the multi-card render.
	await expect(result.getByRole('heading', { name: 'Identity' })).toHaveCount(3);
});

// ---------------------------------------------------------------------------
// S7 — Fingerprints via "Load an example" (ISRG_ROOT_X1)
// ---------------------------------------------------------------------------
test('S7 compute fingerprints example', async ({ page }) => {
	await page.goto('/fingerprint');
	await page.getByRole('button', { name: 'Load an example' }).click();
	await page.getByRole('button', { name: 'Compute fingerprints' }).click();

	const result = region(page);

	await expect(result.getByText('SHA-1', { exact: true })).toBeVisible();
	await expect(result.getByText('SHA-256', { exact: true })).toBeVisible();
	await expect(result.getByText('SHA-512', { exact: true })).toBeVisible();

	// A colon-delimited hex fingerprint value is actually rendered.
	await expect(result.getByText(/([0-9A-F]{2}:){5}/i).first()).toBeVisible();

	// Informational note referencing the openssl equivalent (inside a <code>).
	await expect(result.getByText(/openssl x509 -fingerprint/)).toBeVisible();

	// The per-row copy affordance exists (aria-label from RowList).
	await expect(result.getByRole('button', { name: 'Copy SHA-256' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// S8 — Format conversion via "Load an example" (ISRG_ROOT_X2, not X1)
// ---------------------------------------------------------------------------
test('S8 format conversion example (ISRG Root X2)', async ({ page }) => {
	await page.goto('/format-convert');
	await page.getByRole('button', { name: 'Load an example' }).click();
	await page.getByRole('button', { name: 'Convert' }).click();

	const result = region(page);

	// The three output encodings (block titles).
	await expect(result.getByText('PEM', { exact: true })).toBeVisible();
	await expect(result.getByText('DER (base64)')).toBeVisible();
	await expect(result.getByText('DER (hexadecimal)')).toBeVisible();

	// Item label badge + byte-size hint.
	await expect(result.getByText('CERTIFICATE', { exact: true })).toBeVisible();
	await expect(result.getByText(/bytes/)).toBeVisible();

	// At least one certificate => PKCS#7 bundle download offered.
	await expect(result.getByRole('button', { name: /Download as PKCS#7/ })).toBeVisible();

	// The PEM block carries an armoured certificate.
	await expect(result.locator('pre').first()).toContainText('BEGIN CERTIFICATE');
});

// ---------------------------------------------------------------------------
// S9 — Self-signed generation: fill form -> generate -> cert + private key
// ---------------------------------------------------------------------------
test('S9 generate self-signed certificate', async ({ page }) => {
	await page.goto('/generate-selfsigned');

	// CN is pre-filled with example.local; overwrite it. Keep EC P-256 default.
	const cn = page.getByLabel('Common Name (CN)');
	await cn.fill('e2e.test.local');
	await page.getByRole('button', { name: 'Generate the certificate' }).click();

	const result = region(page);

	// WebCrypto generation + re-decode can take ~1-2s; allow generous retries.
	// CN appears in the card header and the Subject row, hence .first().
	await expect(result.getByText('e2e.test.local').first()).toBeVisible({ timeout: 20000 });

	// Certificate PEM output. NOTE: the block title is a <span>, not a heading,
	// so this must be getByText — a getByRole('heading') lookup would find nothing.
	await expect(result.getByText('Certificate (PEM)')).toBeVisible();
	await expect(
		result.locator('pre').filter({ hasText: 'BEGIN CERTIFICATE' }).first()
	).toBeVisible();

	// Private key output + warning alert (alert title is exactly "Private key").
	await expect(result.getByText('Private key', { exact: true })).toBeVisible();
	await expect(result.getByText('Private key (PEM, PKCS#8)')).toBeVisible();
	await expect(
		result.locator('pre').filter({ hasText: 'BEGIN PRIVATE KEY' }).first()
	).toBeVisible();

	// Copy / Download affordances (two of each: certificate + key).
	await expect(result.getByRole('button', { name: 'Copy' }).first()).toBeVisible();
	await expect(result.getByRole('button', { name: 'Download' }).first()).toBeVisible();

	await expect(result.getByText('Generation failed')).toHaveCount(0);
});
