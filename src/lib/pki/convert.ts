/**
 * Format conversion between PEM, DER and PKCS#7, pure functions over bytes.
 */
import * as pkijs from 'pkijs';
import { splitBlocks, pemToDer, derToPem, bytesToBase64 } from './pem';
import { bytesToHex } from './format';
import { ensurePkijsEngine, toArrayBuffer } from './engine';

const OID_SIGNED_DATA = '1.2.840.113549.1.7.2';
const OID_DATA = '1.2.840.113549.1.7.1';

/** One artefact rendered in every supported representation. */
export type ConvertedItem = {
	/** PEM label, e.g. `CERTIFICATE`, `CERTIFICATE REQUEST`. */
	label: string;
	pem: string;
	der: Uint8Array;
	derBase64: string;
	derHex: string;
};

function itemFromDer(der: Uint8Array, label: string): ConvertedItem {
	return {
		label,
		pem: derToPem(der, label),
		der,
		derBase64: bytesToBase64(der),
		derHex: bytesToHex(der)
	};
}

/** Pull the embedded certificates (as DER) out of a PKCS#7 SignedData blob. */
function extractPkcs7(der: Uint8Array): Uint8Array[] {
	ensurePkijsEngine();
	const contentInfo = pkijs.ContentInfo.fromBER(toArrayBuffer(der));
	if (contentInfo.contentType !== OID_SIGNED_DATA) {
		throw new Error('Unsupported PKCS#7 content type (SignedData expected).');
	}
	const signed = new pkijs.SignedData({ schema: contentInfo.content });
	return (signed.certificates ?? [])
		.filter((c): c is pkijs.Certificate => c instanceof pkijs.Certificate)
		.map((cert) => new Uint8Array(cert.toSchema().toBER()));
}

/**
 * Normalise any pasted artefact into a list of converted items.
 * A PKCS#7 bundle is exploded into its certificates; a multi-block PEM is
 * split; bare base64 is treated as a single DER certificate.
 */
export function convertArtefact(input: string): ConvertedItem[] {
	const blocks = splitBlocks(input);
	const pkcs7 = blocks.find((b) => /PKCS\s?#?7/.test(b.type));
	if (pkcs7) {
		return extractPkcs7(pemToDer(pkcs7.pem)).map((der) => itemFromDer(der, 'CERTIFICATE'));
	}
	if (blocks.length > 0) {
		return blocks.map((b) => itemFromDer(pemToDer(b.pem), b.type));
	}
	return [itemFromDer(pemToDer(input), 'CERTIFICATE')];
}

/** Bundle a set of certificates (DER) into a certs-only PKCS#7 SignedData. */
export function buildPkcs7(certDers: Uint8Array[]): Uint8Array {
	ensurePkijsEngine();
	const signed = new pkijs.SignedData({
		version: 1,
		encapContentInfo: new pkijs.EncapsulatedContentInfo({ eContentType: OID_DATA }),
		certificates: certDers.map((der) => pkijs.Certificate.fromBER(toArrayBuffer(der)))
	});
	const contentInfo = new pkijs.ContentInfo({
		contentType: OID_SIGNED_DATA,
		content: signed.toSchema()
	});
	return new Uint8Array(contentInfo.toSchema().toBER());
}
