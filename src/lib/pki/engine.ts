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
		throw new Error('Web Crypto API is not available in this environment.');
	}
	const engine = new pkijs.CryptoEngine({ name: 'pki-toolbox', crypto });
	// pkijs' bundled `ICryptoEngine` type lags behind lib.dom's `Crypto`
	// (newer X25519 generateKey overloads); the cast bridges that gap.
	pkijs.setEngine('pki-toolbox', engine as unknown as Parameters<typeof pkijs.setEngine>[1]);
	initialised = true;
}

/** Convert a string to the ArrayBuffer of char codes that pkijs expects. */
export function passwordBytes(password: string): ArrayBuffer {
	const bytes = new Uint8Array(password.length);
	for (let i = 0; i < password.length; i++) bytes[i] = password.charCodeAt(i) & 0xff;
	return bytes.buffer;
}

/** View a Uint8Array as a tight ArrayBuffer (asn1js / pkijs want ArrayBuffer). */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
