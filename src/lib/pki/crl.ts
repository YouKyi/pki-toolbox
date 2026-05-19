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
			`Cela ne ressemble pas à une CRL X.509 (${e instanceof Error ? e.message : String(e)}).`,
			{ cause: e }
		);
	}

	const entries: CrlEntry[] = crl.entries.map((entry) => {
		// A missing reason extension is distinct from reason code 0 (unspecified).
		const code = entry.reason as number | undefined;
		return {
			serialNumber: formatSerial(entry.serialNumber),
			revocationDate: entry.revocationDate,
			reason:
				code === undefined
					? 'Aucune (non précisée dans la CRL)'
					: (CRL_REASONS[code] ?? `Code ${code}`)
		};
	});

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
