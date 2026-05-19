/**
 * pkijs needs a Web Crypto engine registered before it can parse PKCS#7 or
 * decrypt PKCS#12. Both the browser and Node 20 expose `globalThis.crypto`.
 */
import * as pkijs from 'pkijs';

let initialised = false;

/** Register a pkijs crypto engine once. Safe to call repeatedly. */
export function ensurePkijsEngine(): void {
	if (initialised) return;
	const crypto = (globalThis as { crypto?: Crypto }).crypto;
	if (!crypto?.subtle) {
		throw new Error('The Web Crypto API is not available in this environment.');
	}
	const engine = new pkijs.CryptoEngine({ name: 'pki-toolbox', crypto });
	// pkijs' bundled `ICryptoEngine` type lags behind lib.dom's `Crypto`
	// (newer X25519 generateKey overloads); the cast bridges that gap.
	pkijs.setEngine('pki-toolbox', engine as unknown as Parameters<typeof pkijs.setEngine>[1]);
	initialised = true;
}

/**
 * Convert a PKCS#12 password to the byte ArrayBuffer pkijs expects. pkijs reads
 * each byte as a code point and performs the RFC 7292 BMPString conversion
 * itself, so only Latin-1 (U+0000..U+00FF) password characters can be
 * represented. A character outside that range is rejected explicitly rather
 * than silently corrupted into a misleading "wrong password" failure.
 */
export function passwordBytes(password: string): ArrayBuffer {
	const bytes = new Uint8Array(password.length);
	for (let i = 0; i < password.length; i++) {
		const code = password.charCodeAt(i);
		if (code > 0xff) {
			throw new Error('PKCS#12 passwords containing non-Latin characters are not supported.');
		}
		bytes[i] = code;
	}
	return bytes.buffer;
}

/** View a Uint8Array as a tight ArrayBuffer (asn1js / pkijs want ArrayBuffer). */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
