import { describe, it, expect } from 'vitest';
import { decodeChain, validateChain } from '$lib/pki/chain';
import { decodeCertificate } from '$lib/pki/parse';
import { TEST_LEAF, TEST_INTERMEDIATE, TEST_ROOT, TEST_CHAIN } from '../fixtures/certs';

describe('validateChain', () => {
	it('marks every link valid for an ordered chain', async () => {
		const certs = await Promise.all(
			[TEST_LEAF, TEST_INTERMEDIATE, TEST_ROOT].map(decodeCertificate)
		);
		expect(validateChain(certs)).toEqual([true, true]);
	});

	it('detects a chain pasted in reverse order', async () => {
		const certs = await Promise.all(
			[TEST_ROOT, TEST_INTERMEDIATE, TEST_LEAF].map(decodeCertificate)
		);
		expect(validateChain(certs)).toEqual([false, false]);
	});
});

describe('decodeChain', () => {
	it('decodes a 3-link chain and classifies each role', async () => {
		const chain = await decodeChain(TEST_CHAIN);
		expect(chain.links).toHaveLength(3);
		expect(chain.links.map((l) => l.role)).toEqual(['leaf', 'intermediate', 'root']);
	});

	it('verifies every issuer↔subject link of a valid chain', async () => {
		const chain = await decodeChain(TEST_CHAIN);
		expect(chain.links[0].issuedByNext).toBe(true);
		expect(chain.links[1].issuedByNext).toBe(true);
		expect(chain.links[2].issuedByNext).toBe(null);
		expect(chain.complete).toBe(true);
	});

	it('flags a chain that is not correctly ordered', async () => {
		const reversed = `${TEST_ROOT}\n${TEST_INTERMEDIATE}\n${TEST_LEAF}`;
		const chain = await decodeChain(reversed);
		expect(chain.complete).toBe(false);
		expect(chain.links[0].issuedByNext).toBe(false);
	});

	it('throws a meaningful error when the input contains no certificate block', async () => {
		await expect(
			decodeChain('-----BEGIN NONSENSE-----\nAAAA\n-----END NONSENSE-----')
		).rejects.toThrowError(/no PEM CERTIFICATE block/i);
	});
});
