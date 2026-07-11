import { test, expect } from '@playwright/test';

/**
 * Full happy path: generate a CA with the existing tool, feed it to the
 * sign-from-a-CA tool, issue a leaf and check the three PEM outputs.
 */
test('issues a CA-signed certificate end to end', async ({ page }) => {
	// 1. Generate a CA.
	await page.goto('/generate-selfsigned');
	await page.getByLabel(/Common Name/).fill('E2E Test CA');
	await page.getByLabel(/Certificate authority/).check();
	await page.getByRole('button', { name: 'Generate the certificate' }).click();

	const caCert = await page.locator('pre').nth(0).innerText();
	const caKey = await page.locator('pre').nth(1).innerText();
	expect(caCert).toContain('BEGIN CERTIFICATE');
	expect(caKey).toContain('BEGIN PRIVATE KEY');

	// 2. Load the CA in the new tool.
	await page.goto('/sign-certificate');
	const pemInputs = page.getByLabel('PKI artefact input');
	await pemInputs.nth(0).fill(caCert);
	await pemInputs.nth(1).fill(caKey);
	await page.getByRole('button', { name: 'Load the CA' }).click();
	await expect(page.getByText('CA loaded')).toBeVisible();
	await expect(page.getByText('E2E Test CA', { exact: false }).first()).toBeVisible();

	// 3. Issue a leaf.
	await page.getByLabel(/Common Name/).fill('leaf.e2e.test');
	await page.getByLabel(/Subject Alternative Names/).fill('leaf.e2e.test');
	await page.getByRole('button', { name: 'Sign the certificate' }).click();

	await expect(page.getByText('Certificate (PEM)')).toBeVisible();
	await expect(page.getByText('Private key (PEM, PKCS#8)')).toBeVisible();
	await expect(page.getByText('Fullchain (certificate + CA)')).toBeVisible();

	const fullchain = await page.locator('pre').last().innerText();
	expect(fullchain.match(/BEGIN CERTIFICATE/g)).toHaveLength(2);
});
