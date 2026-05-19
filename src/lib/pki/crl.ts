/**
 * Certificate Revocation List decoding, via `@peculiar/x509`'s `X509Crl`.
 */
import { X509Crl } from '@peculiar/x509';
import { humanSignatureAlgorithm, formatSerial } from './format';

/** RFC 5280 §5.3.1 revocation reason codes. */
const CRL_REASONS: Record<number, string> = {
	0: 'Non spécifiée',
	1: 'Clé compromise',
	2: 'CA compromise',
	3: 'Affiliation modifiée',
	4: 'Remplacé',
	5: "Cessation d'activité",
	6: 'Suspendu',
	8: 'Retiré de la CRL',
	9: 'Privilège retiré',
	10: 'AA compromise'
};

export type CrlEntry = {
	serialNumber: string;
	revocationDate: Date;
	reason: string;
};

export type DecodedCrl = {
	kind: 'crl';
	issuer: string;
	thisUpdate: Date;
	nextUpdate: Date | null;
	signatureAlgorithm: string;
	entryCount: number;
	entries: CrlEntry[];
};

/** Decode a PEM (or DER-wrapped) X.509 Certificate Revocation List. */
export function decodeCrl(input: string): DecodedCrl {
	let crl: X509Crl;
	try {
		crl = new X509Crl(input);
	} catch (e) {
		throw new Error(
			`This does not look like an X.509 CRL (${e instanceof Error ? e.message : String(e)}).`,
			{ cause: e }
		);
	}

	const entries: CrlEntry[] = crl.entries.map((entry) => ({
		serialNumber: formatSerial(entry.serialNumber),
		revocationDate: entry.revocationDate,
		reason: CRL_REASONS[entry.reason ?? 0] ?? `Code ${entry.reason}`
	}));

	return {
		kind: 'crl',
		issuer: crl.issuer,
		thisUpdate: crl.thisUpdate,
		nextUpdate: crl.nextUpdate ?? null,
		signatureAlgorithm: humanSignatureAlgorithm(crl.signatureAlgorithm),
		entryCount: entries.length,
		entries
	};
}
