/**
 * Every entry point that needs Web Crypto must say so plainly when the runtime
 * has none, instead of failing deep inside a library. Kept in its own file so
 * the pkijs engine starts uninitialised.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensurePkijsEngine } from '#lib/pki/engine.js';
import { decodeChain } from '#lib/pki/chain.js';
import { generateSelfSigned } from '#lib/pki/generate.js';
import { decodeCertificate } from '#lib/pki/parse.js';
import { TEST_CHAIN, ISRG_ROOT_X1 } from '../fixtures/certs';

const MISSING = /Web Crypto API is not available/;

beforeEach(() => vi.stubGlobal('crypto', undefined));
afterEach(() => vi.unstubAllGlobals());

describe('without Web Crypto', () => {
	it('refuses to register the pkijs engine', () => {
		expect(() => ensurePkijsEngine()).toThrowError(MISSING);
	});

	it('refuses to verify a chain', async () => {
		await expect(decodeChain(TEST_CHAIN)).rejects.toThrowError(MISSING);
	});

	it('refuses to generate a certificate', async () => {
		await expect(
			generateSelfSigned({
				commonName: 'x',
				keyAlgorithm: 'ec-p256',
				validityDays: 1,
				sans: [],
				isCa: false
			})
		).rejects.toThrowError(MISSING);
	});

	it('refuses to fingerprint a certificate', async () => {
		await expect(decodeCertificate(ISRG_ROOT_X1)).rejects.toThrowError(MISSING);
	});
});
