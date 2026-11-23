/**
 * Pure parsing functions for PKI artefacts, ported from the validated POC.
 *
 * Everything here runs unchanged in the browser and in Node (for tests):
 * parsing is plain ASN.1 work via `@peculiar/x509`, and fingerprints use the
 * Web Crypto API which both environments expose as `globalThis.crypto`.
 */
// @peculiar/x509 v2 requires a Reflect metadata polyfill on the consumer side
// (its internal tsyringe DI needs Reflect.metadata / Reflect.getMetadata).
import '@abraham/reflection';
import * as asn1js from 'asn1js';
import {
	X509Certificate,
	Pkcs10CertificateRequest,
	ExtensionFactory,
	SubjectAlternativeNameExtension,
	BasicConstraintsExtension,
	KeyUsagesExtension,
	ExtendedKeyUsageExtension,
	KeyUsageFlags,
	type Extension,
	type Name
} from '@peculiar/x509';
import { ekuName, extensionName } from './oids';
import { assertInputSize, splitBlocks } from './pem';
import {
	bytesToHex,
	humanKeyAlgorithm,
	humanSignatureAlgorithm,
	daysBetween,
	type KeyAlgorithmInfo
} from './format';

/** One attribute/value pair of a Distinguished Name. */
export type NamePart = { key: string; value: string };

/** One Subject Alternative Name entry. */
export type SubjectAltName = { type: string; value: string };

/** Summary of an X.509 extension we list but do not fully decode. */
export type ExtensionInfo = { oid: string; name: string; critical: boolean };

export type ValidityStatus = 'valid' | 'expired' | 'not-yet-valid';

export type BasicConstraintsInfo = { ca: boolean; pathLength?: number };

export type DecodedCertificate = {
	kind: 'certificate';
	subject: string;
	issuer: string;
	subjectParts: NamePart[];
	issuerParts: NamePart[];
	serialNumber: string;
	notBefore: Date;
	notAfter: Date;
	validity: ValidityStatus;
	daysUntilExpiry: number;
	publicKey: KeyAlgorithmInfo;
	signatureAlgorithm: string;
	fingerprints: { sha1: string; sha256: string; sha512: string };
	subjectAltNames: SubjectAltName[];
	basicConstraints: BasicConstraintsInfo | null;
	keyUsage: string[];
	extendedKeyUsage: string[];
	extensions: ExtensionInfo[];
	isCA: boolean;
	isSelfSigned: boolean;
	der: Uint8Array;
};

export type DecodedCsr = {
	kind: 'csr';
	subject: string;
	subjectParts: NamePart[];
	publicKey: KeyAlgorithmInfo;
	signatureAlgorithm: string;
	subjectAltNames: SubjectAltName[];
	extendedKeyUsage: string[];
	basicConstraints: BasicConstraintsInfo | null;
};

/** Resolve the Web Crypto implementation, with a clear error if missing. */
function subtle(): SubtleCrypto {
	const c = (globalThis as { crypto?: Crypto }).crypto;
	if (!c?.subtle) throw new Error('The Web Crypto API is not available in this environment.');
	return c.subtle;
}

/** Hash bytes with the named SHA algorithm and return lowercase hex. */
async function digestHex(
	algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512',
	data: BufferSource
): Promise<string> {
	const buf = await subtle().digest(algorithm, data);
	return bytesToHex(buf);
}

function errMessage(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

/** Flatten a peculiar `Name` into ordered attribute/value pairs. */
function nameParts(name: Name): NamePart[] {
	const parts: NamePart[] = [];
	try {
		for (const rdn of name.toJSON()) {
			for (const [key, values] of Object.entries(rdn)) {
				for (const value of values as string[]) parts.push({ key, value });
			}
		}
	} catch {
		/* toJSON can throw on exotic names, the string form is still available */
	}
	return parts;
}

/** Decode the numeric Key Usage bitmask into flag names (POC logic). */
function decodeKeyUsageFlags(usages: number): string[] {
	const out: string[] = [];
	for (const [name, value] of Object.entries(KeyUsageFlags)) {
		const flag = Number(value);
		// Skip the enum's reverse-mapping entries (their value is a string).
		if (Number.isFinite(flag) && flag !== 0 && (usages & flag) === flag) out.push(name);
	}
	return out;
}

const OID_SAN = '2.5.29.17';
const OID_KEY_USAGE = '2.5.29.15';
const OID_BASIC_CONSTRAINTS = '2.5.29.19';
const OID_EXTENDED_KEY_USAGE = '2.5.29.37';
const OID_EXTENSION_REQUEST = '1.2.840.113549.1.9.14';

/** One extension as encoded, with its decoded form when it decodes. */
export type ExtensionEntry = { oid: string; critical: boolean; parsed: Extension | null };

function children(block: asn1js.AsnType | undefined): asn1js.AsnType[] {
	const value = (block as asn1js.Constructed | undefined)?.valueBlock.value;
	return Array.isArray(value) ? value : [];
}

/** The elements of a SEQUENCE, and nothing for any other shape. */
function sequence(block: asn1js.AsnType | undefined): asn1js.AsnType[] {
	return block instanceof asn1js.Sequence ? block.valueBlock.value : [];
}

/** The context-tagged child `[n]` of a constructed block. */
function tagged(block: asn1js.AsnType | undefined, n: number): asn1js.AsnType | undefined {
	return children(block).find((c) => c.idBlock.tagClass === 3 && c.idBlock.tagNumber === n);
}

/**
 * Decodes each extension on its own. peculiar builds its list in a single
 * `map`, so one malformed extension threw, the list it cached stayed empty,
 * and the valid Basic Constraints or Key Usage beside it vanished too: a real
 * CA read as "not a CA". Here a bad extension costs only itself. An entry
 * that is not even `SEQUENCE { OID, ... }` cannot be named, so it is skipped.
 */
function entries(extensions: asn1js.AsnType[]): ExtensionEntry[] {
	return extensions.flatMap((block) => {
		const [id, second] = sequence(block);
		if (!(id instanceof asn1js.ObjectIdentifier)) return [];
		let parsed: Extension | null = null;
		try {
			parsed = ExtensionFactory.create(block.valueBeforeDecodeView as BufferSource);
		} catch {
			// Malformed: still listed, never read.
		}
		return [
			{
				oid: id.getValue(),
				critical: second instanceof asn1js.Boolean && second.getValue(),
				parsed
			}
		];
	});
}

/** Every extension of a certificate, from `tbsCertificate [3] Extensions`. */
export function certificateExtensions(cert: X509Certificate): ExtensionEntry[] {
	const tbs = sequence(asn1js.fromBER(cert.rawData).result)[0];
	return entries(sequence(children(tagged(tbs, 3))[0]));
}

/**
 * Every requested extension of a CSR: the extensionRequest attribute, whose
 * value SET holds one `Extensions` SEQUENCE (RFC 2985 §5.4.2); any other value
 * requests nothing. peculiar has already refused attributes that are not
 * `SEQUENCE { OID, SET }`, so only the value needs checking here.
 */
function csrExtensions(csr: Pkcs10CertificateRequest): ExtensionEntry[] {
	const info = sequence(asn1js.fromBER(csr.rawData).result)[0];
	const request = children(tagged(info, 0)).find(
		(attr) => (sequence(attr)[0] as asn1js.ObjectIdentifier).getValue() === OID_EXTENSION_REQUEST
	);
	return entries(sequence(children(sequence(request)[1])[0]));
}

/** The decoded extension with this OID, if present and well formed. */
export function extensionByOid<T extends Extension>(list: ExtensionEntry[], oid: string): T | null {
	return (list.find((e) => e.oid === oid)?.parsed as T | undefined) ?? null;
}

function readSubjectAltNames(list: ExtensionEntry[]): SubjectAltName[] {
	const ext = extensionByOid<SubjectAlternativeNameExtension>(list, OID_SAN);
	return (ext?.names.toJSON() ?? []).map((n) => ({ type: String(n.type), value: String(n.value) }));
}

function readBasicConstraints(list: ExtensionEntry[]): BasicConstraintsInfo | null {
	const ext = extensionByOid<BasicConstraintsExtension>(list, OID_BASIC_CONSTRAINTS);
	return ext ? { ca: ext.ca, pathLength: ext.pathLength } : null;
}

function readExtendedKeyUsage(list: ExtensionEntry[]): string[] {
	const ext = extensionByOid<ExtendedKeyUsageExtension>(list, OID_EXTENDED_KEY_USAGE);
	return (ext?.usages ?? []).map((usage) => ekuName(String(usage)));
}

/**
 * Decode a single X.509 certificate from PEM text (binary DER uploads are
 * wrapped into PEM by the UI before reaching here).
 * Throws an `Error` with a friendly message when the input is not a cert.
 */
export async function decodeCertificate(input: string): Promise<DecodedCertificate> {
	assertInputSize(input);

	/**
	 * A server bundle is a private key followed by its certificate, which is what
	 * `openssl` writes and what a reader pastes. Handing the whole text to the
	 * parser makes it choke on the key, so the certificate is sliced out first
	 * when the input carries several armoured blocks. A single block, or a bare
	 * base64 DER, is passed through untouched.
	 */
	const blocks = splitBlocks(input);
	const armoured = blocks.find((block) => block.type.toUpperCase().endsWith('CERTIFICATE'));
	const source = blocks.length > 1 && armoured ? armoured.pem : input;

	let cert: X509Certificate;
	try {
		cert = new X509Certificate(source);
	} catch (e) {
		throw new Error(`This does not look like an X.509 certificate (${errMessage(e)}).`, {
			cause: e
		});
	}

	const der = new Uint8Array(cert.rawData);
	const [sha1, sha256, sha512] = await Promise.all([
		digestHex('SHA-1', der),
		digestHex('SHA-256', der),
		digestHex('SHA-512', der)
	]);

	const extensions = certificateExtensions(cert);
	const basicConstraints = readBasicConstraints(extensions);
	const ku = extensionByOid<KeyUsagesExtension>(extensions, OID_KEY_USAGE);
	const now = new Date();
	const validity: ValidityStatus =
		now < cert.notBefore ? 'not-yet-valid' : now > cert.notAfter ? 'expired' : 'valid';

	return {
		kind: 'certificate',
		subject: cert.subject,
		issuer: cert.issuer,
		subjectParts: nameParts(cert.subjectName),
		issuerParts: nameParts(cert.issuerName),
		serialNumber: cert.serialNumber,
		notBefore: cert.notBefore,
		notAfter: cert.notAfter,
		validity,
		daysUntilExpiry: daysBetween(now, cert.notAfter),
		publicKey: humanKeyAlgorithm(cert.publicKey.algorithm),
		signatureAlgorithm: humanSignatureAlgorithm(cert.signatureAlgorithm),
		fingerprints: { sha1, sha256, sha512 },
		subjectAltNames: readSubjectAltNames(extensions),
		basicConstraints,
		keyUsage: ku ? decodeKeyUsageFlags(ku.usages) : [],
		extendedKeyUsage: readExtendedKeyUsage(extensions),
		extensions: extensions.map((e) => ({
			oid: e.oid,
			name: e.parsed ? extensionName(e.oid) : `${extensionName(e.oid)} (malformed)`,
			critical: e.critical
		})),
		isCA: basicConstraints?.ca ?? false,
		isSelfSigned: cert.subject === cert.issuer,
		der
	};
}

/**
 * Decode a PKCS#10 Certificate Signing Request from PEM text.
 * Requested extensions (SAN, EKU, Basic Constraints) are best-effort.
 */
export async function decodeCsr(input: string): Promise<DecodedCsr> {
	assertInputSize(input);

	let csr: Pkcs10CertificateRequest;
	try {
		csr = new Pkcs10CertificateRequest(input);
	} catch (e) {
		throw new Error(`This does not look like a PKCS#10 request (${errMessage(e)}).`, {
			cause: e
		});
	}

	const requested = csrExtensions(csr);
	return {
		kind: 'csr',
		subject: csr.subject,
		subjectParts: nameParts(csr.subjectName),
		publicKey: humanKeyAlgorithm(csr.publicKey.algorithm),
		signatureAlgorithm: humanSignatureAlgorithm(csr.signatureAlgorithm),
		subjectAltNames: readSubjectAltNames(requested),
		extendedKeyUsage: readExtendedKeyUsage(requested),
		basicConstraints: readBasicConstraints(requested)
	};
}
