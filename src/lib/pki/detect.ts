/**
 * What is this thing, and which tool reads it.
 *
 * The parsing layer has always known the answer: a PEM label states the
 * artefact outright, and a DER blob announces itself in its first bytes. The
 * interface simply never used that knowledge, so pasting a CRL into the
 * certificate decoder produced a parse error about a certificate the reader
 * never claimed to have. Pure functions, no DOM, no crypto.
 */
import { base64ToBytes, splitBlocks } from './pem';

export type ArtefactKind =
	| 'certificate'
	| 'chain'
	| 'csr'
	| 'crl'
	| 'pkcs7'
	| 'pkcs12'
	| 'private-key'
	| 'encrypted-private-key'
	| 'public-key'
	| 'der';

export type Detected = {
	kind: ArtefactKind;
	/** How to name it mid-sentence, e.g. "a certificate revocation list". */
	label: string;
	/** The tool that reads it, or null when no tool should: a private key. */
	slug: string | null;
};

const BY_KIND: Record<ArtefactKind, { label: string; slug: string | null }> = {
	certificate: { label: 'an X.509 certificate', slug: 'decode-certificate' },
	chain: { label: 'a certificate chain', slug: 'decode-chain' },
	csr: { label: 'a PKCS#10 signing request', slug: 'decode-csr' },
	crl: { label: 'a certificate revocation list', slug: 'decode-crl' },
	pkcs7: { label: 'a PKCS#7 bundle', slug: 'decode-pkcs7' },
	pkcs12: { label: 'a PKCS#12 keystore', slug: 'decode-pkcs12' },
	// No tool reads a private key, and none should: the product never asks for
	// one except to sign with it, where the page says so itself.
	'private-key': { label: 'a private key', slug: null },
	'encrypted-private-key': { label: 'an encrypted private key', slug: null },
	'public-key': { label: 'a bare public key', slug: 'asn1-viewer' },
	der: { label: 'a DER structure this tool does not recognise', slug: 'asn1-viewer' }
};

/** PEM labels, as OpenSSL and everything downstream of it write them. */
const BY_LABEL: Record<string, ArtefactKind> = {
	CERTIFICATE: 'certificate',
	'TRUSTED CERTIFICATE': 'certificate',
	'X509 CERTIFICATE': 'certificate',
	'CERTIFICATE REQUEST': 'csr',
	'NEW CERTIFICATE REQUEST': 'csr',
	'X509 CRL': 'crl',
	PKCS7: 'pkcs7',
	CMS: 'pkcs7',
	'PRIVATE KEY': 'private-key',
	'RSA PRIVATE KEY': 'private-key',
	'EC PRIVATE KEY': 'private-key',
	'DSA PRIVATE KEY': 'private-key',
	'OPENSSH PRIVATE KEY': 'private-key',
	'ENCRYPTED PRIVATE KEY': 'encrypted-private-key',
	'PUBLIC KEY': 'public-key',
	'RSA PUBLIC KEY': 'public-key'
};

/**
 * The other tools that read the same artefact, in the order a reader is likely
 * to want them. Only tools that will actually parse it: sending a CRL to the
 * fingerprint tool, which decodes certificates, would trade one dead end for
 * another. The ASN.1 viewer takes anything, so it closes every list.
 */
export const RELATED: Record<ArtefactKind, string[]> = {
	certificate: [
		'decode-certificate',
		'fingerprint',
		'format-convert',
		'decode-chain',
		'asn1-viewer'
	],
	chain: ['decode-chain', 'decode-certificate', 'asn1-viewer'],
	csr: ['decode-csr', 'asn1-viewer'],
	crl: ['decode-crl', 'asn1-viewer'],
	pkcs7: ['decode-pkcs7', 'format-convert', 'asn1-viewer'],
	pkcs12: ['decode-pkcs12', 'asn1-viewer'],
	// A key goes nowhere, on purpose: no tool reads one, and the box that holds
	// one covers it rather than offering it a trip.
	'private-key': [],
	'encrypted-private-key': [],
	'public-key': ['asn1-viewer'],
	der: ['asn1-viewer']
};

/**
 * A PKCS#12 file is a `SEQUENCE { INTEGER 3, … }`, and nothing else this
 * product handles starts that way. Cheap enough to run on every drop, which is
 * the point: a `.p12` dropped on the certificate decoder used to be armoured
 * as a certificate and then failed deep in the ASN.1 parser.
 */
export function isPkcs12(bytes: Uint8Array): boolean {
	if (bytes[0] !== 0x30) return false;
	const first = bytes[1];
	// Definite long form: the low bits count the length bytes that follow.
	const header = first > 0x80 ? 2 + (first & 0x7f) : 2;
	return bytes[header] === 0x02 && bytes[header + 1] === 0x01 && bytes[header + 2] === 0x03;
}

/** Detect from raw bytes: a dropped file, or the body of a PEM block. */
export function detectBytes(bytes: Uint8Array): Detected | null {
	if (bytes.length < 4) return null;
	if (isPkcs12(bytes)) return { kind: 'pkcs12', ...BY_KIND.pkcs12 };
	if (bytes[0] === 0x30) return { kind: 'der', ...BY_KIND.der };
	return null;
}

/**
 * Detect from what sits in an input box: armoured text, or a bare base64 blob
 * as the keystore tool accepts.
 */
export function detectArtefact(input: string): Detected | null {
	const text = input.trim();
	if (!text) return null;

	const blocks = splitBlocks(text);
	if (blocks.length) {
		const kinds = blocks
			.map((block) => BY_LABEL[block.type.toUpperCase()])
			.filter((kind): kind is ArtefactKind => Boolean(kind));
		if (!kinds.length) return null;

		/**
		 * A server bundle is a private key followed by its certificate, and that
		 * is what `openssl` writes and what a reader pastes. The key opens
		 * nothing here, so it never decides where the paste goes: the artefact
		 * beside it does. When the paste is nothing but keys, the key answers,
		 * and the answer is that no tool reads it.
		 */
		const routable = kinds.filter((kind) => BY_KIND[kind].slug !== null);
		if (!routable.length) return { kind: kinds[0], ...BY_KIND[kinds[0]] };

		const kind = routable[0];
		if (kind === 'certificate') {
			if (kinds.filter((k) => k === 'certificate').length > 1) {
				return { kind: 'chain', ...BY_KIND.chain };
			}
			// A keystore armoured as a certificate is what a dropped `.p12` used to
			// become, so the bytes get the last word over the label.
			const first = blocks.find((block) => BY_LABEL[block.type.toUpperCase()] === 'certificate');
			try {
				const bytes = base64ToBytes(
					(first?.pem ?? '').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
				);
				if (isPkcs12(bytes)) return { kind: 'pkcs12', ...BY_KIND.pkcs12 };
			} catch {
				/* not base64 at all: the label stays the best answer */
			}
		}
		return { kind, ...BY_KIND[kind] };
	}

	try {
		return detectBytes(base64ToBytes(text));
	} catch {
		return null;
	}
}

/**
 * The private key in a paste, whatever else travels with it.
 *
 * Routing asks "where does this go", and a key never decides that. Covering
 * key material asks a different question, "is one in this box", and the answer
 * has to stay yes for a bundle whose certificate is what gets routed. One
 * predicate each: the box would otherwise uncover a key the moment a
 * certificate was pasted under it.
 */
export function detectPrivateKey(input: string): Detected | null {
	for (const block of splitBlocks(input)) {
		const kind = BY_LABEL[block.type.toUpperCase()];
		if (kind === 'private-key' || kind === 'encrypted-private-key') {
			return { kind, ...BY_KIND[kind] };
		}
	}
	return null;
}

/**
 * Remove complete private-key blocks before handing an artefact to another
 * tool. A server bundle can still carry its certificate or CSR, but the key
 * never follows it to a generic decoder or converter.
 */
export function stripPrivateKeyBlocks(input: string): string {
	const blocks = splitBlocks(input);
	const hasPrivateKey = blocks.some((block) => {
		const kind = BY_LABEL[block.type.toUpperCase()];
		return kind === 'private-key' || kind === 'encrypted-private-key';
	});
	if (!hasPrivateKey) return input;

	return blocks
		.filter((block) => {
			const kind = BY_LABEL[block.type.toUpperCase()];
			return kind !== 'private-key' && kind !== 'encrypted-private-key';
		})
		.map((block) => block.pem)
		.join('\n');
}
