/**
 * PKCS#7 / CMS bundle decoding, via pkijs. Only the SignedData content type is
 * supported (certs-only `.p7b` bundles and detached signatures). Every embedded
 * certificate is re-decoded with the shared `decodeCertificate` parser.
 */
import * as pkijs from 'pkijs';
import { ensurePkijsEngine, toArrayBuffer } from './engine';
import { pemToDer, derToPem } from './pem';
import { decodeCertificate, type DecodedCertificate } from './parse';

const OID_SIGNED_DATA = '1.2.840.113549.1.7.2';

/** Common digest-algorithm OIDs seen in CMS structures. */
const DIGEST_NAMES: Record<string, string> = {
	'1.3.14.3.2.26': 'SHA-1',
	'2.16.840.1.101.3.4.2.1': 'SHA-256',
	'2.16.840.1.101.3.4.2.2': 'SHA-384',
	'2.16.840.1.101.3.4.2.3': 'SHA-512'
};

export type DecodedPkcs7 = {
	kind: 'pkcs7';
	signerCount: number;
	digestAlgorithms: string[];
	certificateCount: number;
	certificates: DecodedCertificate[];
};

/** Decode a PEM (or DER-wrapped) PKCS#7 / CMS SignedData bundle. */
export async function decodePkcs7(input: string): Promise<DecodedPkcs7> {
	ensurePkijsEngine();

	let signed: pkijs.SignedData;
	try {
		const contentInfo = pkijs.ContentInfo.fromBER(toArrayBuffer(pemToDer(input)));
		if (contentInfo.contentType !== OID_SIGNED_DATA) {
			throw new Error('the PKCS#7 content type is not SignedData');
		}
		signed = new pkijs.SignedData({ schema: contentInfo.content });
	} catch (e) {
		throw new Error(
			`This does not look like a PKCS#7 bundle (${e instanceof Error ? e.message : String(e)}).`,
			{ cause: e }
		);
	}

	const embedded = (signed.certificates ?? []).filter(
		(c): c is pkijs.Certificate => c instanceof pkijs.Certificate
	);
	const certificates = await Promise.all(
		embedded.map((cert) => decodeCertificate(derToPem(new Uint8Array(cert.toSchema().toBER()))))
	);

	return {
		kind: 'pkcs7',
		signerCount: signed.signerInfos?.length ?? 0,
		digestAlgorithms: (signed.digestAlgorithms ?? []).map(
			(algo) => DIGEST_NAMES[algo.algorithmId] ?? algo.algorithmId
		),
		certificateCount: certificates.length,
		certificates
	};
}
