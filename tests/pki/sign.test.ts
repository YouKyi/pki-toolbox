import { describe, it, expect } from 'vitest';
import { generateSelfSigned } from '$lib/pki/generate';
import { importCa, issueCertificate } from '$lib/pki/sign';
import {
	X509Certificate,
	Pkcs10CertificateRequest,
	AuthorityKeyIdentifierExtension,
	SubjectKeyIdentifierExtension,
	KeyUsagesExtension,
	KeyUsageFlags
} from '@peculiar/x509';
import { decodeCertificate } from '$lib/pki/parse';
import { derToPem } from '$lib/pki/pem';
import { TEST_CSR } from '../fixtures/certs';

/**
 * A self-signed RSA-PSS CA (cert + PKCS#8 key), generated once via openssl:
 *
 *   openssl genpkey -algorithm RSA-PSS -pkeyopt rsa_keygen_bits:2048 \
 *     -pkeyopt rsa_pss_keygen_md:sha256 -pkeyopt rsa_pss_keygen_mgf1_md:sha256 \
 *     -pkeyopt rsa_pss_keygen_saltlen:32 -out rsapss.key
 *   openssl req -new -x509 -key rsapss.key -out rsapss.crt -days 3650 \
 *     -subj "/CN=rsa-pss.sign.test" -sha256
 *   openssl pkey -in rsapss.key -out rsapss_pkcs8.key
 *
 * Inlined as a static fixture rather than generated in-test: Node's WebCrypto
 * exports RSA-PSS public keys under the plain `rsaEncryption` SPKI OID (no PSS
 * parameters), identical to a PKCS#1 v1.5 key, so a cert built in-test via
 * `X509CertificateGenerator.createSelfSigned` with WebCrypto RSA-PSS keys is
 * indistinguishable from RSASSA-PKCS1-v1_5 to `caAlgorithm` and never exercises
 * the "Unsupported CA key type" branch. openssl encodes the SPKI with the
 * `id-RSASSA-PSS` OID instead, which `@peculiar/x509` reports as `RSA-PSS`.
 */
const RSA_PSS_CA_CERT = `-----BEGIN CERTIFICATE-----
MIIDtTCCAmmgAwIBAgIUL7ruKIxEdF1hOgfS8MHTCRfglv0wQQYJKoZIhvcNAQEK
MDSgDzANBglghkgBZQMEAgEFAKEcMBoGCSqGSIb3DQEBCDANBglghkgBZQMEAgEF
AKIDAgEgMBwxGjAYBgNVBAMMEXJzYS1wc3Muc2lnbi50ZXN0MB4XDTI2MDcxMTEz
MTgyNVoXDTM2MDcwODEzMTgyNVowHDEaMBgGA1UEAwwRcnNhLXBzcy5zaWduLnRl
c3QwggFWMEEGCSqGSIb3DQEBCjA0oA8wDQYJYIZIAWUDBAIBBQChHDAaBgkqhkiG
9w0BAQgwDQYJYIZIAWUDBAIBBQCiAwIBIAOCAQ8AMIIBCgKCAQEAuupx2ZgE7OL1
nzwgzd2xewD7NiZBVDd6jMOcHQChNSMr2NefNsEmPidePaVodSoe2TUCSGgSsKaY
UKnmI9ILzIUuTFnm706Z/wwzNt4Zqqw+TZdtLgV272pIujQ9GquJoGmiRGAuYnG9
qRIKNSMWrKfsQLUX9eT+e98kiCsJjug/uH8eOyhdW66nTiMJPaStHCJeluXC6qfC
53g8ZMI40nIZya8ttmzJleSTmYmlguVY+J9Anr/G+xcz9gBP8wijy2xjw6jBluL8
/DKOQrg4nI1r7MKKJg6gT/rej0sN+lBfyWgto97jI13rB/uP07WxwiJARM9RLDeY
HwDcbzWUywIDAQABo1MwUTAdBgNVHQ4EFgQUlqJICKSq+veO3OHyyLAjzLd2eaAw
HwYDVR0jBBgwFoAUlqJICKSq+veO3OHyyLAjzLd2eaAwDwYDVR0TAQH/BAUwAwEB
/zBBBgkqhkiG9w0BAQowNKAPMA0GCWCGSAFlAwQCAQUAoRwwGgYJKoZIhvcNAQEI
MA0GCWCGSAFlAwQCAQUAogMCASADggEBAHZNm/MNCXA4wZWwjG83RKToCnqBiugl
qPfYkfXfK6RqRPsaVCBqKFZHkzt0tYQ+RS2xDYZTIbd8xRE8DIhGBfIRSYtVc+CO
7D93HxpRLclBy80Tx5t4Sl1Ud2BjD5Ifd6xDRYODlaJ5jFMyY2ijVSNanwHOispe
+wGqdEtDT+8bM5iAekukW0gPER3dlKWlS6lg52AB0/4+gyBVIGnjjD/U7cre7GIc
sYZtQCbE1mbttZ2iSZcFnWJ3xj+NNQjYVEazSWSSI8ityRzGPCvn9h+ST9Q0F7Gm
FD+/wEq194z7N0NrZMr4F64Ojxd4mtuiv73OYSqru9zmEUMrpe8eAT8=
-----END CERTIFICATE-----`;

const RSA_PSS_CA_KEY = `-----BEGIN PRIVATE KEY-----
MIIE7wIBADBBBgkqhkiG9w0BAQowNKAPMA0GCWCGSAFlAwQCAQUAoRwwGgYJKoZI
hvcNAQEIMA0GCWCGSAFlAwQCAQUAogMCASAEggSlMIIEoQIBAAKCAQEAuupx2ZgE
7OL1nzwgzd2xewD7NiZBVDd6jMOcHQChNSMr2NefNsEmPidePaVodSoe2TUCSGgS
sKaYUKnmI9ILzIUuTFnm706Z/wwzNt4Zqqw+TZdtLgV272pIujQ9GquJoGmiRGAu
YnG9qRIKNSMWrKfsQLUX9eT+e98kiCsJjug/uH8eOyhdW66nTiMJPaStHCJeluXC
6qfC53g8ZMI40nIZya8ttmzJleSTmYmlguVY+J9Anr/G+xcz9gBP8wijy2xjw6jB
luL8/DKOQrg4nI1r7MKKJg6gT/rej0sN+lBfyWgto97jI13rB/uP07WxwiJARM9R
LDeYHwDcbzWUywIDAQABAoH/Lxfil3A1zXlhaT09BqFUlikpIfuBejaAKfce3i/K
bhjuczPgaWtAt2gz1lRWfS6flxpD+Po/u0I+HhSwZ1YEowLrJ1F/XcvwANKSFMDg
tp+vEt2UJIQ78xZUPJXsz0to4YG74H5bMXJ21qI08C5nCBlG7QazgsCvXYZbLfOp
9Ncf6btSdqWbJP/Dkl1D2BRiOZc52z+np12lutCl6cVDnFRbp8Xk4+LxdOuFvcsC
QGlsdQDKGQ9WeP8jzS/cysipLA4EBDcu26uIA4PPZ3c6Hxv853HLg8gLhFiyKcHr
n2z1Ky54xTeCOFsOHTz29H/tKGvCG0x4cHSuEFLP9qntAoGBAPt5YZGXlwV15n7x
tFt3SbaLRHzygldyJOGjQZO6DPWqcXw8UFhtpos11iZV2D4vjuO/5SPMNMNnTVaA
tytq3w+mrsRDDYybD69BjulMe9AALTkVa2nD+DH23JGulJIqc5PGkpgvUX4aMfUD
atUaFpfZ8Lt1HhUDSH2Co9oiTDpVAoGBAL5Hn5fFbVi5tK0KjxQkPka4qH6ghRx6
ad7nF2RJymNhLmITy8i6wu+eHmKzjqybGD4tHFvs8HqEkdpKUG4KjvmHHCIySwkI
UMQRxhRqOedFtRj9UGIIe2c11Adh48uqxKnmf7Ft2a62XHsZOxU+uV69I/XRc2jb
1NUTa2Ri1fKfAoGABWgRqfCpZYuoXfhSWVkSM6OA4HLSTJD+q/83jLaGSs3UTMh7
LbuFxh5tMTvNP2EEYG8ivQdJ5x2UcxSnW36btxltTnjmlKxMxQbSzL9BNjKaxkxo
l8iH0IMvMM6hERdqjrXJNw5lYSGtC0h8hoJeE/uyikU1VVxRtakWXr04CFUCgYBA
wSEnxlFLE4/QH7rHcPocmTUGOtxx75rd96j3QUF2BpmBWRlNy3kRkK7oihCw3usm
JbXz9rN0Dm+QaR/sAv3bH0bMwG7WuRS7VQ0i32+rLAbQZUyYwCg23JO2m3KpWgkp
hL7KBAdDtN3OKqz3suvkuNtnCYuMENviU4SFmjkTIwKBgQDCuYmHUhpBchUkY2+G
5eyOsiGWJ4LzZoNu4IjrUT3hV5e9xqw5nOV0RQG2Ak8kXS2p9oUVLGcqrjHpRasb
vQNobgWkZxMMHdUMaxwZmNOoupI5/pPxzsGwH3LBH6ywlx1cowrvlI09XD1yIe0X
c7IpubDWshDA9AAQfy8fk4i8kw==
-----END PRIVATE KEY-----`;

/** Generate a fresh CA (cert + key PEM) with the existing generator. */
async function makeCa(
	keyAlgorithm: 'ec-p256' | 'rsa-2048' | 'ed25519' = 'ec-p256',
	validityDays = 3650
) {
	return generateSelfSigned({
		commonName: 'sign.test CA',
		keyAlgorithm,
		validityDays,
		sans: [],
		isCa: true
	});
}

describe('importCa', () => {
	it('imports an EC CA and derives its signing algorithm', async () => {
		const ca = await makeCa('ec-p256');
		const ctx = await importCa(ca.certificatePem, ca.privateKeyPem);
		expect(ctx.signingAlgorithm).toEqual({ name: 'ECDSA', hash: 'SHA-256' });
		expect(ctx.warnings).toHaveLength(0);
		expect(ctx.cert.subject).toContain('sign.test CA');
	});

	it('imports an RSA CA', async () => {
		const ca = await makeCa('rsa-2048');
		const ctx = await importCa(ca.certificatePem, ca.privateKeyPem);
		expect(ctx.signingAlgorithm).toEqual({ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' });
	});

	it('imports an Ed25519 CA', async () => {
		const ca = await makeCa('ed25519');
		const ctx = await importCa(ca.certificatePem, ca.privateKeyPem);
		expect(ctx.signingAlgorithm).toEqual({ name: 'Ed25519' });
	});

	it('rejects an encrypted PKCS#8 key with an openssl hint', async () => {
		const ca = await makeCa();
		const encrypted =
			'-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIBvTBXBgkqhkiG9w0BBQ0=\n-----END ENCRYPTED PRIVATE KEY-----';
		await expect(importCa(ca.certificatePem, encrypted)).rejects.toThrowError(/openssl pkey/);
	});

	it('rejects a key that does not match the certificate', async () => {
		const a = await makeCa();
		const b = await makeCa();
		await expect(importCa(a.certificatePem, b.privateKeyPem)).rejects.toThrowError(
			/does not match/i
		);
	});

	it('rejects garbage instead of a certificate', async () => {
		const ca = await makeCa();
		await expect(importCa('not a cert', ca.privateKeyPem)).rejects.toThrowError(/CA certificate/i);
	});

	it('rejects an unsupported CA key type (RSA-PSS)', async () => {
		await expect(importCa(RSA_PSS_CA_CERT, RSA_PSS_CA_KEY)).rejects.toThrowError(
			/Unsupported CA key type/
		);
	});

	it('warns (non-blocking) when the certificate is not a CA', async () => {
		const leaf = await generateSelfSigned({
			commonName: 'not-a-ca.test',
			keyAlgorithm: 'ec-p256',
			validityDays: 365,
			sans: [],
			isCa: false
		});
		const ctx = await importCa(leaf.certificatePem, leaf.privateKeyPem);
		expect(ctx.warnings.some((w) => /not marked as a CA/i.test(w))).toBe(true);
	});
});

describe('issueCertificate (new key pair)', () => {
	it('issues a leaf signed by the CA, with SKI/AKI and a fullchain', async () => {
		const caPems = await makeCa('ec-p256');
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);
		const issued = await issueCertificate(ca, {
			commonName: 'leaf.sign.test',
			organization: 'pki-toolbox',
			country: 'FR',
			validityDays: 365,
			sans: ['leaf.sign.test', 'alt.sign.test'],
			isCa: false,
			subject: { kind: 'generate', keyAlgorithm: 'ec-p256' }
		});

		expect(issued.privateKeyPem).toContain('BEGIN PRIVATE KEY');
		expect(issued.warnings).toHaveLength(0);
		// fullchain = leaf + CA
		expect(issued.fullchainPem.match(/BEGIN CERTIFICATE/g)).toHaveLength(2);

		const leaf = new X509Certificate(issued.certificatePem);
		// signed by the CA, not self-signed
		expect(await leaf.verify({ publicKey: ca.cert.publicKey })).toBe(true);
		expect(leaf.issuer).toBe(ca.cert.subject);

		// AKI == SHA-1 key id of the CA public key (the generated CA has no SKI
		// extension, so compute the expected id directly from its key)
		const expectedSki = await SubjectKeyIdentifierExtension.create(ca.cert.publicKey);
		expect(leaf.getExtension(AuthorityKeyIdentifierExtension)?.keyId).toBe(expectedSki.keyId);
		expect(leaf.getExtension(SubjectKeyIdentifierExtension)?.keyId).toBeTruthy();

		const decoded = await decodeCertificate(issued.certificatePem);
		expect(decoded.isCA).toBe(false);
		expect(decoded.subjectAltNames.map((s) => s.value)).toContain('alt.sign.test');
	});

	it('issues an intermediate CA that can itself sign', async () => {
		const rootPems = await makeCa('ec-p256');
		const root = await importCa(rootPems.certificatePem, rootPems.privateKeyPem);
		const inter = await issueCertificate(root, {
			commonName: 'sign.test Intermediate CA',
			validityDays: 1825,
			sans: [],
			isCa: true,
			subject: { kind: 'generate', keyAlgorithm: 'ec-p256' }
		});

		const interCert = new X509Certificate(inter.certificatePem);
		const ku = interCert.getExtension(KeyUsagesExtension);
		expect((ku!.usages & KeyUsageFlags.keyCertSign) !== 0).toBe(true);
		expect((await decodeCertificate(inter.certificatePem)).isCA).toBe(true);

		// The intermediate can sign a leaf in turn.
		const interCtx = await importCa(inter.certificatePem, inter.privateKeyPem!);
		const leaf = await issueCertificate(interCtx, {
			commonName: 'deep.sign.test',
			validityDays: 365,
			sans: ['deep.sign.test'],
			isCa: false,
			subject: { kind: 'generate', keyAlgorithm: 'ec-p256' }
		});
		const leafCert = new X509Certificate(leaf.certificatePem);
		expect(await leafCert.verify({ publicKey: interCert.publicKey })).toBe(true);
	});

	it('warns when the requested validity outlives the CA', async () => {
		const caPems = await makeCa('ec-p256', 30);
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);
		const issued = await issueCertificate(ca, {
			commonName: 'outlives.sign.test',
			validityDays: 365,
			sans: [],
			isCa: false,
			subject: { kind: 'generate', keyAlgorithm: 'ec-p256' }
		});
		expect(issued.warnings.some((w) => /CA certificate expires/i.test(w))).toBe(true);
	});

	it('requires a Common Name', async () => {
		const caPems = await makeCa();
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);
		await expect(
			issueCertificate(ca, {
				commonName: '  ',
				validityDays: 365,
				sans: [],
				isCa: false,
				subject: { kind: 'generate', keyAlgorithm: 'ec-p256' }
			})
		).rejects.toThrowError(/Common Name/);
	});
});

describe('issueCertificate (CSR)', () => {
	it('certifies the public key of a valid CSR, without a private key output', async () => {
		const caPems = await makeCa('ec-p256');
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);
		const issued = await issueCertificate(ca, {
			commonName: 'from-csr.sign.test',
			validityDays: 365,
			sans: ['from-csr.sign.test'],
			isCa: false,
			subject: { kind: 'csr', csrPem: TEST_CSR }
		});

		expect(issued.privateKeyPem).toBeUndefined();
		const leaf = new X509Certificate(issued.certificatePem);
		expect(await leaf.verify({ publicKey: ca.cert.publicKey })).toBe(true);
		// The certified key is the CSR's, not a fresh one.
		const { Pkcs10CertificateRequest } = await import('@peculiar/x509');
		const csr = new Pkcs10CertificateRequest(TEST_CSR);
		expect(leaf.publicKey.toString('hex')).toBe(csr.publicKey.toString('hex'));
		// Subject comes from the form, not the CSR.
		expect(leaf.subject).toContain('from-csr.sign.test');
	});

	it('rejects a CSR that parses fine but whose signature does not verify (proof-of-possession)', async () => {
		const caPems = await makeCa('ec-p256');
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);

		// Flip a low-order bit in one of the last bytes of the DER, which lands
		// inside the signature BIT STRING (not the certificationRequestInfo),
		// so the outer PKCS#10 structure still parses cleanly and only the
		// signature itself becomes bogus.
		const original = new Pkcs10CertificateRequest(TEST_CSR);
		const raw = new Uint8Array(original.rawData);
		raw[raw.length - 1] ^= 0x01;
		const tampered = derToPem(raw, 'CERTIFICATE REQUEST');

		// Sanity check: this is the load-bearing assumption of the test. If the
		// tampered CSR failed to parse, the assertion below would pass for the
		// wrong reason (parse-failure branch instead of verify-false branch).
		expect(() => new Pkcs10CertificateRequest(tampered)).not.toThrow();

		await expect(
			issueCertificate(ca, {
				commonName: 'tampered.sign.test',
				validityDays: 365,
				sans: [],
				isCa: false,
				subject: { kind: 'csr', csrPem: tampered }
			})
		).rejects.toThrowError(/CSR signature is invalid/i);
	});

	it('rejects input that is not a CSR', async () => {
		const caPems = await makeCa('ec-p256');
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);
		await expect(
			issueCertificate(ca, {
				commonName: 'x.sign.test',
				validityDays: 365,
				sans: [],
				isCa: false,
				subject: { kind: 'csr', csrPem: 'not a csr' }
			})
		).rejects.toThrowError(/PKCS#10/i);
	});
});
