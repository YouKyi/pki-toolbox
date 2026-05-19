/**
 * PKCS#12 (.p12 / .pfx) decoding, via pkijs.
 *
 * The container is opened with the supplied password: the MAC integrity is
 * verified, every certificate bag is decoded with the shared certificate
 * parser, and private-key bags are reported but never displayed.
 */
import * as pkijs from 'pkijs';
import { ensurePkijsEngine, toArrayBuffer, passwordBytes } from './engine';
import { pemToDer, derToPem } from './pem';
import { decodeCertificate, type DecodedCertificate } from './parse';

const OID_CERT_BAG = '1.2.840.113549.1.12.10.1.3';
const OID_KEY_BAG = '1.2.840.113549.1.12.10.1.1';
const OID_SHROUDED_KEY_BAG = '1.2.840.113549.1.12.10.1.2';
const OID_X509_CERTIFICATE = '1.2.840.113549.1.9.22.1';
const OID_FRIENDLY_NAME = '1.2.840.113549.1.9.20';

const KEY_ALGORITHMS: Record<string, string> = {
	'1.2.840.113549.1.1.1': 'RSA',
	'1.2.840.10045.2.1': 'EC',
	'1.3.101.112': 'Ed25519',
	'1.3.101.113': 'Ed448'
};

export type Pkcs12Key = {
	friendlyName: string | null;
	algorithm: string | null;
	encrypted: boolean;
};

export type DecodedPkcs12 = {
	kind: 'pkcs12';
	integrityVerified: boolean;
	certificateCount: number;
	certificates: DecodedCertificate[];
	keyCount: number;
	keys: Pkcs12Key[];
};

function readFriendlyName(bag: pkijs.SafeBag): string | null {
	const attr = bag.bagAttributes?.find((a) => a.type === OID_FRIENDLY_NAME);
	const block = attr?.values?.[0] as { valueBlock?: { value?: unknown } } | undefined;
	const value = block?.valueBlock?.value;
	return typeof value === 'string' && value.length > 0 ? value : null;
}

async function readKeyAlgorithm(bag: pkijs.SafeBag, password: ArrayBuffer): Promise<string | null> {
	try {
		const bagValue = bag.bagValue as {
			parseInternalValues?: (p: { password: ArrayBuffer }) => Promise<unknown>;
			parsedValue?: pkijs.PrivateKeyInfo;
			privateKeyAlgorithm?: { algorithmId: string };
		};
		if (typeof bagValue.parseInternalValues === 'function') {
			await bagValue.parseInternalValues({ password });
		}
		const oid =
			bagValue.parsedValue?.privateKeyAlgorithm?.algorithmId ??
			bagValue.privateKeyAlgorithm?.algorithmId;
		if (!oid) return null;
		return KEY_ALGORITHMS[oid] ?? oid;
	} catch {
		return null;
	}
}

/** Decode a PKCS#12 file (PEM- or DER-wrapped) using the given password. */
export async function decodePkcs12(input: string, password: string): Promise<DecodedPkcs12> {
	ensurePkijsEngine();
	const pwd = passwordBytes(password);

	let pfx: pkijs.PFX;
	try {
		pfx = pkijs.PFX.fromBER(toArrayBuffer(pemToDer(input)));
	} catch (e) {
		throw new Error(
			`This does not look like a PKCS#12 file (${e instanceof Error ? e.message : String(e)}).`,
			{ cause: e }
		);
	}

	const hasMac = !!pfx.macData;
	try {
		await pfx.parseInternalValues({ password: pwd, checkIntegrity: hasMac });
	} catch (e) {
		throw new Error('Mot de passe incorrect, ou intégrité du fichier PKCS#12 invalide.', {
			cause: e
		});
	}

	const authSafe = pfx.parsedValue?.authenticatedSafe;
	if (!authSafe) throw new Error('Ce fichier PKCS#12 ne contient aucun élément exploitable.');

	try {
		await authSafe.parseInternalValues({
			safeContents: Array.from({ length: authSafe.safeContents.length }, () => ({
				password: pwd
			}))
		});
	} catch (e) {
		throw new Error('Impossible de déchiffrer le contenu, mot de passe incorrect.', { cause: e });
	}

	const certificates: DecodedCertificate[] = [];
	const keys: Pkcs12Key[] = [];

	for (const safeContent of authSafe.parsedValue.safeContents) {
		for (const bag of safeContent.value.safeBags) {
			if (bag.bagId === OID_CERT_BAG) {
				const certBag = bag.bagValue as pkijs.CertBag;
				const parsed = certBag.parsedValue;
				if (certBag.certId === OID_X509_CERTIFICATE && parsed instanceof pkijs.Certificate) {
					const der = new Uint8Array(parsed.toSchema().toBER());
					certificates.push(await decodeCertificate(derToPem(der)));
				}
			} else if (bag.bagId === OID_KEY_BAG || bag.bagId === OID_SHROUDED_KEY_BAG) {
				keys.push({
					friendlyName: readFriendlyName(bag),
					algorithm: await readKeyAlgorithm(bag, pwd),
					encrypted: bag.bagId === OID_SHROUDED_KEY_BAG
				});
			}
		}
	}

	return {
		kind: 'pkcs12',
		integrityVerified: hasMac,
		certificateCount: certificates.length,
		certificates,
		keyCount: keys.length,
		keys
	};
}
