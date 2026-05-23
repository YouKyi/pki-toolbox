/**
 * Certificate Revocation List decoding, via `@peculiar/x509`'s `X509Crl`.
 */
// @peculiar/x509 v2 requires a Reflect metadata polyfill on the consumer side.
import '@abraham/reflection';
import { X509Crl } from '@peculiar/x509';
import { humanSignatureAlgorithm, formatSerial } from './format';
import { assertInputSize } from './pem';

/** RFC 5280 §5.3.1 revocation reason codes. */
const CRL_REASONS: Record<number, string> = {
	0: 'Unspecified',
	1: 'Key compromise',
	2: 'CA compromise',
	3: 'Affiliation changed',
	4: 'Superseded',
	5: 'Cessation of operation',
	6: 'Certificate hold',
	8: 'Removed from CRL',
	9: 'Privilege withdrawn',
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
	assertInputSize(input);

	let crl: X509Crl;
	try {
		crl = new X509Crl(input);
	} catch (e) {
		throw new Error(
			`This does not look like an X.509 CRL (${e instanceof Error ? e.message : String(e)}).`,
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
					? 'None (not specified in the CRL)'
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
