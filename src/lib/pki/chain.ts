/**
 * Certificate-chain decoding and linkage validation.
 *
 * A chain is verified by checking, for each certificate, that its `issuer`
 * Distinguished Name matches the `subject` of the next certificate in the
 * list — exactly the rule from the validated POC.
 */
import { splitBlocks } from './pem';
import { decodeCertificate, type DecodedCertificate } from './parse';

export type ChainRole = 'leaf' | 'intermediate' | 'root';

export type ChainLink = {
	/** Position in the pasted chain (0 = first). */
	index: number;
	certificate: DecodedCertificate;
	role: ChainRole;
	/** Whether this cert is issued by the next one; `null` for the last link. */
	issuedByNext: boolean | null;
};

export type DecodedChain = {
	links: ChainLink[];
	/** True when every link is verified and the chain ends in a self-signed root. */
	complete: boolean;
};

/**
 * POC-compatible adjacency check. `result[i]` is `true` when `certs[i]` is
 * issued by `certs[i + 1]` (i.e. their issuer/subject names match).
 */
export function validateChain(certs: { issuer: string; subject: string }[]): boolean[] {
	return certs.slice(0, -1).map((cert, i) => cert.issuer === certs[i + 1].subject);
}

function classifyRole(cert: DecodedCertificate): ChainRole {
	if (cert.isSelfSigned) return 'root';
	if (cert.isCA) return 'intermediate';
	return 'leaf';
}

/**
 * Decode every `CERTIFICATE` block of a (possibly concatenated) PEM string and
 * report the chain in pasted order with per-link linkage status.
 */
export async function decodeChain(pem: string): Promise<DecodedChain> {
	const blocks = splitBlocks(pem).filter((b) => b.type.endsWith('CERTIFICATE'));
	if (blocks.length === 0) {
		throw new Error('No PEM CERTIFICATE blocks were found in the input.');
	}

	const certs = await Promise.all(blocks.map((b) => decodeCertificate(b.pem)));

	const links: ChainLink[] = certs.map((certificate, index) => {
		const next = certs[index + 1];
		return {
			index,
			certificate,
			role: classifyRole(certificate),
			issuedByNext: next ? certificate.issuer === next.subject : null
		};
	});

	const allLinked = links.slice(0, -1).every((l) => l.issuedByNext === true);
	const endsInRoot = certs[certs.length - 1].isSelfSigned;

	return { links, complete: allLinked && endsInRoot };
}
