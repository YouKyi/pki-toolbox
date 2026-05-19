/**
 * Pure parsing functions for PKI artefacts, ported from the validated POC.
 *
 * Everything here runs unchanged in the browser and in Node (for tests):
 * parsing is plain ASN.1 work via `@peculiar/x509`, and fingerprints use the
 * Web Crypto API which both environments expose as `globalThis.crypto`.
 */
import {
	X509Certificate,
	Pkcs10CertificateRequest,
	SubjectAlternativeNameExtension,
	BasicConstraintsExtension,
	KeyUsagesExtension,
	ExtendedKeyUsageExtension,
	KeyUsageFlags,
	type Extension,
	type Name
} from '@peculiar/x509';
import { ekuName, extensionName } from './oids';
import { assertInputSize } from './pem';
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

// Look extensions up by OID string rather than by class: on a
// `Pkcs10CertificateRequest` the requested extensions are generic objects, so
// a class-based `getExtension` misses them, an OID lookup works on both.
const OID_SAN = '2.5.29.17';
const OID_BASIC_CONSTRAINTS = '2.5.29.19';
const OID_EXTENDED_KEY_USAGE = '2.5.29.37';

type ExtensionHost = { getExtension(type: string): Extension | null };

function readSubjectAltNames(host: ExtensionHost): SubjectAltName[] {
	try {
		const ext = host.getExtension(OID_SAN) as SubjectAlternativeNameExtension | null;
		if (!ext?.names) return [];
		return ext.names.toJSON().map((n) => ({ type: String(n.type), value: String(n.value) }));
	} catch {
		return [];
	}
}

function readBasicConstraints(host: ExtensionHost): BasicConstraintsInfo | null {
	try {
		const ext = host.getExtension(OID_BASIC_CONSTRAINTS) as BasicConstraintsExtension | null;
		return ext ? { ca: ext.ca, pathLength: ext.pathLength } : null;
	} catch {
		return null;
	}
}

function readExtendedKeyUsage(host: ExtensionHost): string[] {
	try {
		const ext = host.getExtension(OID_EXTENDED_KEY_USAGE) as ExtendedKeyUsageExtension | null;
		return (ext?.usages ?? []).map((usage) => ekuName(String(usage)));
	} catch {
		return [];
	}
}

/**
 * Decode a single X.509 certificate from PEM text (binary DER uploads are
 * wrapped into PEM by the UI before reaching here).
 * Throws an `Error` with a friendly message when the input is not a cert.
 */
export async function decodeCertificate(input: string): Promise<DecodedCertificate> {
	assertInputSize(input);

	let cert: X509Certificate;
	try {
		cert = new X509Certificate(input);
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

	const basicConstraints = readBasicConstraints(cert);
	const ku = cert.getExtension(KeyUsagesExtension);
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
		subjectAltNames: readSubjectAltNames(cert),
		basicConstraints,
		keyUsage: ku ? decodeKeyUsageFlags(ku.usages) : [],
		extendedKeyUsage: readExtendedKeyUsage(cert),
		extensions: cert.extensions.map((e) => ({
			oid: e.type,
			name: extensionName(e.type),
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

	return {
		kind: 'csr',
		subject: csr.subject,
		subjectParts: nameParts(csr.subjectName),
		publicKey: humanKeyAlgorithm(csr.publicKey.algorithm),
		signatureAlgorithm: humanSignatureAlgorithm(csr.signatureAlgorithm),
		subjectAltNames: readSubjectAltNames(csr),
		extendedKeyUsage: readExtendedKeyUsage(csr),
		basicConstraints: readBasicConstraints(csr)
	};
}
