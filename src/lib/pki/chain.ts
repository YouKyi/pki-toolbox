/**
 * Certificate-chain decoding and validation.
 *
 * Each link is verified cryptographically: the signature of certificate i is
 * checked against the public key of certificate i+1 (and the final root is
 * checked against its own key). This proves real issuance, not just that the
 * issuer and subject Distinguished Names happen to match.
 */
import { X509Certificate, cryptoProvider } from '@peculiar/x509';
import { splitBlocks, assertInputSize } from './pem';
import { decodeCertificate, type DecodedCertificate } from './parse';

export type ChainRole = 'leaf' | 'intermediate' | 'root';

export type ChainLink = {
	/** Position in the pasted chain (0 = first). */
	index: number;
	certificate: DecodedCertificate;
	role: ChainRole;
	/**
	 * True when this certificate's signature is cryptographically verified
	 * against the next certificate's public key. `null` for the last link.
	 */
	issuedByNext: boolean | null;
};

export type DecodedChain = {
	links: ChainLink[];
	/** True when every link is verified and the chain ends in a verified self-signed root. */
	complete: boolean;
};

/**
 * Name-based adjacency check (POC-compatible, kept for quick comparisons and
 * tests). `result[i]` is `true` when `certs[i].issuer` equals
 * `certs[i + 1].subject`. This only compares Distinguished Name strings; use
 * `decodeChain` for real cryptographic verification.
 */
export function validateChain(certs: { issuer: string; subject: string }[]): boolean[] {
	return certs.slice(0, -1).map((cert, i) => cert.issuer === certs[i + 1].subject);
}

function classifyRole(cert: DecodedCertificate): ChainRole {
	if (cert.isSelfSigned) return 'root';
	if (cert.isCA) return 'intermediate';
	return 'leaf';
}

/** Verify `cert`'s signature against `issuer`'s public key (signature only). */
async function isSignedBy(cert: X509Certificate, issuer: X509Certificate): Promise<boolean> {
	try {
		return await cert.verify({ publicKey: issuer.publicKey, signatureOnly: true });
	} catch {
		return false;
	}
}

/**
 * Decode every certificate block of a (possibly concatenated) PEM string and
 * report the chain in pasted order with cryptographically verified linkage.
 */
export async function decodeChain(pem: string): Promise<DecodedChain> {
	assertInputSize(pem);
	const blocks = splitBlocks(pem).filter(
		(b) => b.type === 'CERTIFICATE' || b.type === 'X509 CERTIFICATE'
	);
	if (blocks.length === 0) {
		throw new Error('No PEM CERTIFICATE block was found in the input.');
	}

	const crypto = (globalThis as { crypto?: Crypto }).crypto;
	if (!crypto?.subtle) throw new Error('The Web Crypto API is not available in this environment.');
	cryptoProvider.set(crypto);

	const x509 = blocks.map((b) => new X509Certificate(b.pem));
	const decoded = await Promise.all(blocks.map((b) => decodeCertificate(b.pem)));

	const links: ChainLink[] = await Promise.all(
		decoded.map(async (certificate, index) => {
			const next = x509[index + 1];
			return {
				index,
				certificate,
				role: classifyRole(certificate),
				issuedByNext: next ? await isSignedBy(x509[index], next) : null
			};
		})
	);

	const allLinked = links.slice(0, -1).every((l) => l.issuedByNext === true);
	const last = x509[x509.length - 1];
	const endsInRoot = decoded[decoded.length - 1].isSelfSigned && (await isSignedBy(last, last));

	return { links, complete: allLinked && endsInRoot };
}
