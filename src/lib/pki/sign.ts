/**
 * Certificate issuance signed by an existing CA, entirely in the browser.
 * The CA private key is imported into WebCrypto and never leaves the page.
 */
// @peculiar/x509 v2 requires a Reflect metadata polyfill on the consumer side.
import '@abraham/reflection';
import {
	X509Certificate,
	X509CertificateGenerator,
	BasicConstraintsExtension,
	KeyUsagesExtension,
	KeyUsageFlags,
	ExtendedKeyUsageExtension,
	SubjectAlternativeNameExtension,
	SubjectKeyIdentifierExtension,
	AuthorityKeyIdentifierExtension,
	cryptoProvider,
	type Extension,
	type PublicKeyType
} from '@peculiar/x509';
import { pemToDer, derToPem } from './pem';
import {
	ALGORITHMS,
	KEY_ALGORITHM_LABELS,
	randomSerial,
	buildName,
	webCrypto,
	type KeyAlgorithmChoice
} from './generate';

export type CaContext = {
	cert: X509Certificate;
	key: CryptoKey;
	signingAlgorithm: { name: string; hash?: string };
	/** Non-blocking issues detected at import time. */
	warnings: string[];
};

type CaAlgo = {
	import: RsaHashedImportParams | EcKeyImportParams | Algorithm;
	sign: { name: string; hash?: string };
};

function errMessage(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

/** Map the CA certificate's public-key algorithm to WebCrypto import/sign params. */
function caAlgorithm(cert: X509Certificate): CaAlgo {
	const alg = cert.publicKey.algorithm as { name: string; namedCurve?: string };
	switch (alg.name) {
		case 'RSASSA-PKCS1-v1_5':
			return {
				import: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
				sign: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
			};
		case 'ECDSA': {
			const curve = alg.namedCurve ?? '';
			const hash =
				curve === 'P-256'
					? 'SHA-256'
					: curve === 'P-384'
						? 'SHA-384'
						: curve === 'P-521'
							? 'SHA-512'
							: '';
			if (!hash) throw new Error(`Unsupported EC curve for a CA key: ${curve || 'unknown'}.`);
			return { import: { name: 'ECDSA', namedCurve: curve }, sign: { name: 'ECDSA', hash } };
		}
		case 'Ed25519':
			return { import: { name: 'Ed25519' }, sign: { name: 'Ed25519' } };
		default:
			throw new Error(
				`Unsupported CA key type: ${alg.name}. Supported: RSA (PKCS#1 v1.5), EC P-256/P-384/P-521, Ed25519.`
			);
	}
}

/**
 * Parse the CA certificate, import its private key into WebCrypto and verify
 * that both belong together (sign/verify probe). Throws on any hard failure;
 * soft issues (certificate not marked as a CA) land in `warnings`.
 */
export async function importCa(certPem: string, keyPem: string): Promise<CaContext> {
	const crypto = webCrypto();
	cryptoProvider.set(crypto);

	if (/-----BEGIN ENCRYPTED PRIVATE KEY-----/.test(keyPem)) {
		throw new Error(
			'This private key is encrypted, which is not supported. Decrypt it first: openssl pkey -in encrypted.key -out clear.key'
		);
	}

	let cert: X509Certificate;
	try {
		cert = new X509Certificate(certPem);
	} catch (e) {
		throw new Error(`The CA certificate could not be parsed (${errMessage(e)}).`, { cause: e });
	}

	const algo = caAlgorithm(cert);

	let key: CryptoKey;
	try {
		const der = pemToDer(keyPem);
		key = await crypto.subtle.importKey('pkcs8', der as BufferSource, algo.import, false, ['sign']);
	} catch (e) {
		throw new Error(
			`The CA private key could not be imported as PKCS#8 (${errMessage(e)}). It must be an unencrypted "BEGIN PRIVATE KEY" block matching the certificate's key type.`,
			{ cause: e }
		);
	}

	// Sign/verify probe: proves the pasted key is the certificate's key.
	const probe = crypto.getRandomValues(new Uint8Array(32));
	let matches = false;
	try {
		const publicKey = await cert.publicKey.export(algo.import, ['verify'], crypto);
		const signature = await crypto.subtle.sign(algo.sign, key, probe);
		matches = await crypto.subtle.verify(algo.sign, publicKey, signature, probe);
	} catch {
		matches = false;
	}
	if (!matches) throw new Error('The private key does not match the CA certificate.');

	const warnings: string[] = [];
	const bc = cert.getExtension(BasicConstraintsExtension);
	if (!bc?.ca) {
		warnings.push(
			'This certificate is not marked as a CA (Basic Constraints cA is not set); verifiers may reject certificates it signs.'
		);
	}

	return { cert, key, signingAlgorithm: algo.sign, warnings };
}

export type IssueSubject =
	{ kind: 'generate'; keyAlgorithm: KeyAlgorithmChoice } | { kind: 'csr'; csrPem: string };

export type IssueOptions = {
	commonName: string;
	organization?: string;
	country?: string;
	validityDays: number;
	/** DNS Subject Alternative Names. */
	sans: string[];
	/** Issue an intermediate CA (Basic Constraints cA = true). */
	isCa: boolean;
	subject: IssueSubject;
};

export type IssuedCertificate = {
	certificatePem: string;
	/** Only present when the tool generated the key pair. */
	privateKeyPem?: string;
	/** Issued certificate followed by the CA certificate. */
	fullchainPem: string;
	warnings: string[];
};

/**
 * Issue a certificate signed by the imported CA. The subject key pair is
 * either generated locally or taken from a verified CSR (Task 4).
 */
export async function issueCertificate(
	ca: CaContext,
	opts: IssueOptions
): Promise<IssuedCertificate> {
	if (!opts.commonName.trim()) throw new Error('The Common Name (CN) is required.');

	const crypto = webCrypto();
	cryptoProvider.set(crypto);

	let publicKey: PublicKeyType;
	let privateKeyPem: string | undefined;

	if (opts.subject.kind === 'generate') {
		const spec = ALGORITHMS[opts.subject.keyAlgorithm];
		let keys: CryptoKeyPair;
		try {
			keys = (await crypto.subtle.generateKey(spec.generate, true, [
				'sign',
				'verify'
			])) as CryptoKeyPair;
		} catch (e) {
			throw new Error(
				`This browser cannot generate a ${KEY_ALGORITHM_LABELS[opts.subject.keyAlgorithm]} key.`,
				{ cause: e }
			);
		}
		publicKey = keys.publicKey;
		const pkcs8 = await crypto.subtle.exportKey('pkcs8', keys.privateKey);
		privateKeyPem = derToPem(new Uint8Array(pkcs8), 'PRIVATE KEY');
	} else {
		publicKey = await csrPublicKey(opts.subject.csrPem, crypto); // Task 4
	}

	const notBefore = new Date(Date.now() - 60_000); // 1 min in the past for clock skew
	const notAfter = new Date(notBefore.getTime() + opts.validityDays * 86_400_000);

	const warnings: string[] = [];
	if (notAfter > ca.cert.notAfter) {
		warnings.push(
			`The requested validity ends after the CA certificate expires (${ca.cert.notAfter.toISOString().slice(0, 10)}); the chain will not verify past that date.`
		);
	}

	const keyUsage = opts.isCa
		? KeyUsageFlags.keyCertSign | KeyUsageFlags.cRLSign
		: KeyUsageFlags.digitalSignature | KeyUsageFlags.keyEncipherment;

	const extensions: Extension[] = [
		new BasicConstraintsExtension(opts.isCa, undefined, true),
		new KeyUsagesExtension(keyUsage, true),
		await SubjectKeyIdentifierExtension.create(publicKey, false, crypto),
		await AuthorityKeyIdentifierExtension.create(ca.cert.publicKey, false, crypto)
	];
	if (!opts.isCa) {
		// serverAuth + clientAuth
		extensions.push(
			new ExtendedKeyUsageExtension(['1.3.6.1.5.5.7.3.1', '1.3.6.1.5.5.7.3.2'], false)
		);
	}
	const sans = opts.sans.map((v) => v.trim()).filter(Boolean);
	if (sans.length) {
		extensions.push(
			new SubjectAlternativeNameExtension(sans.map((value) => ({ type: 'dns' as const, value })))
		);
	}

	const cert = await X509CertificateGenerator.create({
		serialNumber: randomSerial(crypto),
		subject: buildName(opts),
		issuer: ca.cert.subjectName,
		notBefore,
		notAfter,
		signingAlgorithm: ca.signingAlgorithm,
		publicKey,
		signingKey: ca.key,
		extensions
	});

	const certificatePem = cert.toString('pem');
	return {
		certificatePem,
		privateKeyPem,
		fullchainPem: `${certificatePem}\n${ca.cert.toString('pem')}\n`,
		warnings
	};
}

async function csrPublicKey(csrPem: string, crypto: Crypto): Promise<PublicKeyType> {
	void csrPem;
	void crypto;
	throw new Error('CSR mode not implemented yet.');
}
