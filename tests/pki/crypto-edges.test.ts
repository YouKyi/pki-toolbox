/**
 * The failure and fallback paths of the crypto and container layer: CA keys on
 * other curves, refusals, malformed extensions, unusual PKCS#7 / PKCS#12
 * shapes, and non-Error throws from the libraries underneath.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import '@abraham/reflection';
import {
	X509Certificate,
	X509CertificateGenerator,
	X509Crl,
	Pkcs10CertificateRequest,
	Pkcs10CertificateRequestGenerator,
	BasicConstraintsExtension,
	KeyUsagesExtension,
	KeyUsageFlags,
	Extension
} from '@peculiar/x509';
import { importCa, issueCertificate } from '#lib/pki/sign.js';
import { generateSelfSigned } from '#lib/pki/generate.js';
import { decodeCertificate, decodeCsr } from '#lib/pki/parse.js';
import { decodeCrl } from '#lib/pki/crl.js';
import { decodePkcs7 } from '#lib/pki/pkcs7.js';
import { decodePkcs12 } from '#lib/pki/pkcs12.js';
import { convertArtefact } from '#lib/pki/convert.js';
import { derToPem, pemToDer, bytesToBase64 } from '#lib/pki/pem.js';
import { toArrayBuffer } from '#lib/pki/engine.js';
import {
	ISRG_ROOT_X2,
	TEST_CSR,
	TEST_CRL,
	TEST_PKCS7,
	TEST_PKCS12,
	TEST_PKCS12_PASSWORD
} from '../fixtures/certs';

/** A CA on secp256k1, generated once with openssl; only the certificate is needed. */
const SECP256K1_CA = `-----BEGIN CERTIFICATE-----
MIIBbjCCAROgAwIBAgIURWFlGRSboPlHyueawkk+vPlm3tEwCgYIKoZIzj0EAwIw
HjEcMBoGA1UEAwwTc2VjcDI1NmsxLnNpZ24udGVzdDAeFw0yNjExMTgxMDQ1NTZa
Fw0zNjExMTUxMDQ1NTZaMB4xHDAaBgNVBAMME3NlY3AyNTZrMS5zaWduLnRlc3Qw
VjAQBgcqhkjOPQIBBgUrgQQACgNCAAQLFXh5boyzH9e6nncyuUGk/raNvrNiUO8z
bdW2cKHzTG6PmvVjDHsXeib2eXRueQmFF82qJ5BIwLP0LivpCvEOozIwMDAdBgNV
HQ4EFgQUr5hVyc00pwRCend2blkWoGph46wwDwYDVR0TAQH/BAUwAwEB/zAKBggq
hkjOPQQDAgNJADBGAiEA09qaMBnWUz8HyhWpTMg87Oe7dhunp4NS+GjSdoqpu2YC
IQDlZ3IojpGmue6+KIfbNyhOWsgjcXfAPBX8FeZd0iqLaQ==
-----END CERTIFICATE-----`;

const DAY = 86_400_000;

afterEach(() => vi.restoreAllMocks());

/** A self-signed EC certificate on `curve`, with the given extensions, and its PKCS#8 key. */
async function makeCert(
	curve: 'P-256' | 'P-384' | 'P-521',
	extensions: Extension[],
	notBefore = new Date(Date.now() - DAY)
) {
	const hash = { 'P-256': 'SHA-256', 'P-384': 'SHA-384', 'P-521': 'SHA-512' }[curve];
	const alg = { name: 'ECDSA', namedCurve: curve, hash };
	const keys = await crypto.subtle.generateKey(alg, true, ['sign', 'verify']);
	const cert = await X509CertificateGenerator.createSelfSigned({
		serialNumber: '01',
		name: `CN=${curve} edge`,
		keys,
		signingAlgorithm: alg,
		notBefore,
		notAfter: new Date(notBefore.getTime() + 365 * DAY),
		extensions
	});
	const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey));
	return { certPem: cert.toString('pem'), keyPem: derToPem(pkcs8, 'PRIVATE KEY') };
}

/** Makes a peculiar parse hook throw a non-Error, which the callers must still report. */
function throwStringOnParse(proto: object) {
	vi.spyOn(proto as { onInit: () => void }, 'onInit').mockImplementation(() => {
		throw 'boom';
	});
}

const caExtension = () => new BasicConstraintsExtension(true, undefined, true);

describe('importCa', () => {
	it('derives SHA-384 and SHA-512 for P-384 and P-521 CAs', async () => {
		const p384 = await makeCert('P-384', [caExtension()]);
		expect((await importCa(p384.certPem, p384.keyPem)).signingAlgorithm).toEqual({
			name: 'ECDSA',
			hash: 'SHA-384'
		});
		const p521 = await makeCert('P-521', [caExtension()]);
		expect((await importCa(p521.certPem, p521.keyPem)).signingAlgorithm.hash).toBe('SHA-512');
	});

	it('refuses a CA on a curve WebCrypto cannot sign with', async () => {
		await expect(importCa(SECP256K1_CA, '')).rejects.toThrowError(
			'Unsupported EC curve for a CA key: K-256.'
		);
	});

	it('names an EC key without a named curve as unknown', async () => {
		vi.spyOn(X509Certificate.prototype, 'publicKey', 'get').mockReturnValue({
			algorithm: { name: 'ECDSA' }
		} as X509Certificate['publicKey']);
		await expect(importCa(SECP256K1_CA, '')).rejects.toThrowError(
			'Unsupported EC curve for a CA key: unknown.'
		);
	});

	it('reports a certificate parser failure even when it is not an Error', async () => {
		throwStringOnParse(X509Certificate.prototype);
		await expect(importCa(SECP256K1_CA, '')).rejects.toThrowError(
			'The CA certificate could not be parsed (boom).'
		);
	});

	it('refuses a key that is not PKCS#8', async () => {
		const ca = await makeCert('P-256', [caExtension()]);
		await expect(importCa(ca.certPem, ca.certPem)).rejects.toThrowError(
			/could not be imported as PKCS#8/
		);
	});

	it('treats a failing sign/verify probe as a mismatch', async () => {
		const ca = await makeCert('P-256', [caExtension()]);
		vi.spyOn(crypto.subtle, 'sign').mockRejectedValueOnce(new Error('no'));
		await expect(importCa(ca.certPem, ca.keyPem)).rejects.toThrowError(
			'The private key does not match the CA certificate.'
		);
	});

	it('refuses a CA whose Key Usage lacks keyCertSign', async () => {
		const ca = await makeCert('P-256', [
			caExtension(),
			new KeyUsagesExtension(KeyUsageFlags.digitalSignature, true)
		]);
		await expect(importCa(ca.certPem, ca.keyPem)).rejects.toThrowError(/lacks keyCertSign/);
	});
});

describe('issueCertificate failures', () => {
	const options = {
		commonName: 'leaf.test',
		validityDays: 30,
		sans: [],
		isCa: false
	};

	it('reports a key the browser cannot generate', async () => {
		const ca = await makeCert('P-256', [caExtension()]);
		const ctx = await importCa(ca.certPem, ca.keyPem);
		vi.spyOn(crypto.subtle, 'generateKey').mockRejectedValueOnce(new Error('no'));
		await expect(
			issueCertificate(ctx, { ...options, subject: { kind: 'generate', keyAlgorithm: 'ec-p256' } })
		).rejects.toThrowError('This browser cannot generate a EC P-256 key.');
	});

	it('refuses a CSR whose signature check throws', async () => {
		const ca = await makeCert('P-256', [caExtension()]);
		const ctx = await importCa(ca.certPem, ca.keyPem);
		vi.spyOn(Pkcs10CertificateRequest.prototype, 'verify').mockRejectedValueOnce(new Error('no'));
		await expect(
			issueCertificate(ctx, { ...options, subject: { kind: 'csr', csrPem: TEST_CSR } })
		).rejects.toThrowError('The CSR signature is invalid; refusing to certify its key.');
	});
});

describe('generateSelfSigned failures', () => {
	const options = { keyAlgorithm: 'ec-p256' as const, validityDays: 1, sans: [], isCa: false };

	it('requires a Common Name', async () => {
		await expect(generateSelfSigned({ ...options, commonName: '  ' })).rejects.toThrowError(
			'The Common Name (CN) is required.'
		);
	});

	it('reports a key the browser cannot generate', async () => {
		vi.spyOn(crypto.subtle, 'generateKey').mockRejectedValueOnce(new Error('no'));
		await expect(generateSelfSigned({ ...options, commonName: 'x' })).rejects.toThrowError(
			'This browser cannot generate a EC P-256 key.'
		);
	});
});

describe('decodeCertificate edge cases', () => {
	it('flags a certificate whose validity has not started yet', async () => {
		const { certPem } = await makeCert('P-256', [], new Date(Date.now() + DAY));
		expect((await decodeCertificate(certPem)).validity).toBe('not-yet-valid');
	});

	it('shrugs off SAN, Basic Constraints and EKU extensions that do not parse', async () => {
		const garbage = new Uint8Array([0x05, 0x00]);
		const { certPem } = await makeCert('P-256', [
			new Extension('2.5.29.17', false, garbage),
			new Extension('2.5.29.19', false, garbage),
			new Extension('2.5.29.37', false, garbage)
		]);
		const cert = await decodeCertificate(certPem);
		expect(cert.subjectAltNames).toEqual([]);
		expect(cert.basicConstraints).toBeNull();
		expect(cert.isCA).toBe(false);
		expect(cert.extendedKeyUsage).toEqual([]);
	});

	it('keeps decoding when every extension lookup by OID throws', async () => {
		// A malformed extension makes peculiar throw once, then cache an empty
		// list, so only the first reader ever sees the throw: force it for all.
		vi.spyOn(X509Certificate.prototype, 'getExtension').mockImplementation(((type: unknown) => {
			if (typeof type === 'string') throw new Error('bad extension');
			return null;
		}) as X509Certificate['getExtension']);
		const cert = await decodeCertificate(ISRG_ROOT_X2);
		expect(cert.subjectAltNames).toEqual([]);
		expect(cert.extendedKeyUsage).toEqual([]);
		expect(cert.basicConstraints).toBeNull();
	});

	it('decodes a CSR whose requested SAN does not parse', async () => {
		const alg = { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' };
		const keys = await crypto.subtle.generateKey(alg, true, ['sign', 'verify']);
		const csr = await Pkcs10CertificateRequestGenerator.create({
			name: 'CN=bad-san.test',
			keys,
			signingAlgorithm: alg,
			extensions: [new Extension('2.5.29.17', false, new Uint8Array([0x05, 0x00]))]
		});
		const decoded = await decodeCsr(csr.toString('pem'));
		expect(decoded.subject).toBe('CN=bad-san.test');
		expect(decoded.subjectAltNames).toEqual([]);
	});

	it('reports a parser failure even when it is not an Error', async () => {
		throwStringOnParse(X509Certificate.prototype);
		await expect(decodeCertificate(ISRG_ROOT_X2)).rejects.toThrowError(
			'This does not look like an X.509 certificate (boom).'
		);
	});

	it('reports a CSR parser failure even when it is not an Error', async () => {
		throwStringOnParse(Pkcs10CertificateRequest.prototype);
		await expect(decodeCsr(TEST_CSR)).rejects.toThrowError(
			'This does not look like a PKCS#10 request (boom).'
		);
	});
});

describe('decodeCrl edge cases', () => {
	it('reports a parser failure even when it is not an Error', () => {
		throwStringOnParse(X509Crl.prototype);
		expect(() => decodeCrl(TEST_CRL)).toThrowError('This does not look like an X.509 CRL (boom).');
	});
});

/** A certs-free SignedData with one signer and a known plus an unknown digest. */
function signedDataWithoutCertificates(): string {
	const cert = pkijs.Certificate.fromBER(toArrayBuffer(pemToDer(ISRG_ROOT_X2)));
	const sha256 = () => new pkijs.AlgorithmIdentifier({ algorithmId: '2.16.840.1.101.3.4.2.1' });
	const signed = new pkijs.SignedData({
		version: 1,
		encapContentInfo: new pkijs.EncapsulatedContentInfo({ eContentType: '1.2.840.113549.1.7.1' }),
		digestAlgorithms: [sha256(), new pkijs.AlgorithmIdentifier({ algorithmId: '1.2.3.4' })],
		signerInfos: [
			new pkijs.SignerInfo({
				version: 1,
				sid: new pkijs.IssuerAndSerialNumber({
					issuer: cert.issuer,
					serialNumber: cert.serialNumber
				}),
				digestAlgorithm: sha256(),
				signatureAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: '1.2.840.10045.4.3.2' }),
				signature: new asn1js.OctetString({ valueHex: new Uint8Array(8).buffer })
			})
		]
	});
	const info = new pkijs.ContentInfo({
		contentType: '1.2.840.113549.1.7.2',
		content: signed.toSchema(true)
	});
	return derToPem(new Uint8Array(info.toSchema().toBER()), 'PKCS7');
}

describe('PKCS#7 edge cases', () => {
	it('counts signers and keeps unknown digest OIDs as they are', async () => {
		const p7 = await decodePkcs7(signedDataWithoutCertificates());
		expect(p7.signerCount).toBe(1);
		expect(p7.digestAlgorithms).toEqual(['SHA-256', '1.2.3.4']);
		expect(p7.certificateCount).toBe(0);
	});

	it('converts a SignedData without a certificates field to nothing', () => {
		expect(convertArtefact(signedDataWithoutCertificates())).toEqual([]);
	});

	it('reports a parser failure even when it is not an Error', async () => {
		vi.spyOn(pkijs.ContentInfo, 'fromBER').mockImplementation(() => {
			throw 'boom';
		});
		await expect(decodePkcs7(TEST_PKCS7)).rejects.toThrowError(
			'This does not look like a PKCS#7 bundle (boom).'
		);
	});
});

describe('convertArtefact', () => {
	it('reads bare base64 as a single DER certificate', () => {
		const b64 = bytesToBase64(pemToDer(ISRG_ROOT_X2));
		const [item] = convertArtefact(b64);
		expect(item.derBase64).toBe(b64);
		expect(item.pem).toContain('BEGIN CERTIFICATE');
	});
});

const OID_FRIENDLY_NAME = '1.2.840.113549.1.9.20';

/** A key bag around a PrivateKeyInfo (DER), optionally named. */
function keyBag(privateKeyInfo: ArrayBuffer, friendlyName?: string): pkijs.SafeBag {
	return new pkijs.SafeBag({
		bagId: '1.2.840.113549.1.12.10.1.1',
		bagValue: pkijs.PrivateKeyInfo.fromBER(privateKeyInfo),
		bagAttributes:
			friendlyName === undefined
				? undefined
				: [
						new pkijs.Attribute({
							type: OID_FRIENDLY_NAME,
							values: [new asn1js.BmpString({ value: friendlyName })]
						})
					]
	});
}

/** An unprotected PKCS#12 (no MAC, plain safe contents) around `bags`. */
function p12(bags: pkijs.SafeBag[], extra: pkijs.ContentInfo[] = []): string {
	const data = (bytes: ArrayBuffer) =>
		new pkijs.ContentInfo({
			contentType: '1.2.840.113549.1.7.1',
			content: new asn1js.OctetString({ valueHex: bytes })
		});
	const safe = new pkijs.SafeContents({ safeBags: bags }).toSchema().toBER();
	const authenticatedSafe = new pkijs.AuthenticatedSafe({ safeContents: [data(safe), ...extra] });
	const pfx = new pkijs.PFX({ authSafe: data(authenticatedSafe.toSchema().toBER()) });
	return bytesToBase64(new Uint8Array(pfx.toSchema().toBER()));
}

/** PrivateKeyInfo DER: version 0, the given algorithm OID bytes, an empty key. */
function privateKeyInfo(oid: number[]): ArrayBuffer {
	const alg = [0x30, oid.length + 2, 0x06, oid.length, ...oid];
	const body = [0x02, 0x01, 0x00, ...alg, 0x04, 0x00];
	return new Uint8Array([0x30, body.length, ...body]).buffer;
}

/** A cert bag carrying an (unsigned) attribute certificate rather than an X.509 one. */
function attributeCertificateBag(): pkijs.SafeBag {
	const cert = pkijs.Certificate.fromBER(toArrayBuffer(pemToDer(ISRG_ROOT_X2)));
	const names = () =>
		new pkijs.GeneralNames({ names: [new pkijs.GeneralName({ type: 4, value: cert.subject })] });
	const alg = () => new pkijs.AlgorithmIdentifier({ algorithmId: '1.2.840.10045.4.3.2' });
	const attributeCertificate = new pkijs.AttributeCertificateV2({
		acinfo: new pkijs.AttributeCertificateInfoV2({
			version: 1,
			holder: new pkijs.Holder({ entityName: names() }),
			issuer: new pkijs.V2Form({ issuerName: names() }),
			signature: alg(),
			serialNumber: new asn1js.Integer({ value: 1 }),
			attrCertValidityPeriod: new pkijs.AttCertValidityPeriod({
				notBeforeTime: new Date(),
				notAfterTime: new Date()
			}),
			attributes: [new pkijs.Attribute({ type: '2.5.4.72', values: [new asn1js.Null()] })]
		}),
		signatureAlgorithm: alg(),
		signatureValue: new asn1js.BitString({ valueHex: new Uint8Array(8).buffer })
	});
	return new pkijs.SafeBag({
		bagId: '1.2.840.113549.1.12.10.1.3',
		bagValue: new pkijs.CertBag({
			certId: '1.2.840.113549.1.9.22.3',
			certValue: new asn1js.OctetString({ valueHex: attributeCertificate.toSchema().toBER() })
		})
	});
}

/** A secret bag, written as raw ASN.1: pkijs cannot serialise one it did not parse. */
function secretBag(): pkijs.SafeBag {
	const value = new asn1js.Sequence({
		value: [
			new asn1js.ObjectIdentifier({ value: '1.2.3.4' }),
			new asn1js.Constructed({
				idBlock: { tagClass: 3, tagNumber: 0 },
				value: [new asn1js.OctetString({ valueHex: new Uint8Array([1]).buffer })]
			})
		]
	});
	return new pkijs.SafeBag({
		bagId: '1.2.840.113549.1.12.10.1.5',
		bagValue: { toSchema: () => value } as unknown as pkijs.SecretBag
	});
}

describe('PKCS#12 edge cases', () => {
	it('reads unencrypted key bags, named or not, with known, unknown or empty algorithms', async () => {
		const ec = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
			'sign'
		]);
		const pkcs8 = await crypto.subtle.exportKey('pkcs8', ec.privateKey);
		const store = await decodePkcs12(
			p12([
				keyBag(pkcs8, 'server key'),
				keyBag(privateKeyInfo([0x2a, 0x03, 0x04]), ''),
				keyBag(privateKeyInfo([]))
			]),
			'unused'
		);
		expect(store.integrityVerified).toBe(false);
		expect(store.keys).toEqual([
			{ friendlyName: 'server key', algorithm: 'EC', encrypted: false },
			{ friendlyName: null, algorithm: '1.2.3.4', encrypted: false },
			{ friendlyName: null, algorithm: null, encrypted: false }
		]);
	});

	it('skips attribute-certificate bags and bags of other kinds', async () => {
		const store = await decodePkcs12(p12([attributeCertificateBag(), secretBag()]), '');
		expect(store.certificateCount).toBe(0);
		expect(store.keyCount).toBe(0);
	});

	it('reports a shrouded key it cannot open as encrypted, without an algorithm', async () => {
		vi.spyOn(pkijs.PKCS8ShroudedKeyBag.prototype, 'parseInternalValues').mockRejectedValue(
			new Error('no')
		);
		const store = await decodePkcs12(TEST_PKCS12, TEST_PKCS12_PASSWORD);
		expect(store.keys).toEqual([expect.objectContaining({ algorithm: null, encrypted: true })]);
	});

	it('rejects content it cannot decrypt', async () => {
		const broken = new pkijs.ContentInfo({
			contentType: '1.2.840.113549.1.7.6',
			content: new asn1js.Integer({ value: 1 })
		});
		await expect(decodePkcs12(p12([], [broken]), '')).rejects.toThrowError(
			'Could not decrypt the content, incorrect password.'
		);
	});

	it('rejects DER that is not a PKCS#12 file', async () => {
		await expect(decodePkcs12('MAMCAQE=', '')).rejects.toThrowError(
			/^This does not look like a PKCS#12 file \(/
		);
	});

	it('reports a parser failure even when it is not an Error', async () => {
		vi.spyOn(pkijs.PFX, 'fromBER').mockImplementation(() => {
			throw 'boom';
		});
		await expect(decodePkcs12(TEST_PKCS12, '')).rejects.toThrowError(
			'This does not look like a PKCS#12 file (boom).'
		);
	});
});
