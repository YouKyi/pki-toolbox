/**
 * Self-signed X.509 certificate generation, entirely in the browser via the
 * Web Crypto API and `@peculiar/x509`'s certificate generator. The private key
 * never leaves the page.
 */
import {
	X509CertificateGenerator,
	BasicConstraintsExtension,
	KeyUsagesExtension,
	ExtendedKeyUsageExtension,
	SubjectAlternativeNameExtension,
	KeyUsageFlags,
	cryptoProvider,
	type Extension,
	type JsonName
} from '@peculiar/x509';
import { derToPem } from './pem';

export type KeyAlgorithmChoice = 'rsa-2048' | 'rsa-4096' | 'ec-p256' | 'ec-p384' | 'ed25519';

/** Human labels for the key-algorithm picker. */
export const KEY_ALGORITHM_LABELS: Record<KeyAlgorithmChoice, string> = {
	'rsa-2048': 'RSA 2048 bits',
	'rsa-4096': 'RSA 4096 bits',
	'ec-p256': 'EC P-256',
	'ec-p384': 'EC P-384',
	ed25519: 'Ed25519'
};

type AlgoSpec = {
	generate: RsaHashedKeyGenParams | EcKeyGenParams | { name: 'Ed25519' };
	sign: { name: string; hash?: string };
};

const ALGORITHMS: Record<KeyAlgorithmChoice, AlgoSpec> = {
	'rsa-2048': {
		generate: {
			name: 'RSASSA-PKCS1-v1_5',
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256'
		},
		sign: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
	},
	'rsa-4096': {
		generate: {
			name: 'RSASSA-PKCS1-v1_5',
			modulusLength: 4096,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256'
		},
		sign: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
	},
	'ec-p256': {
		generate: { name: 'ECDSA', namedCurve: 'P-256' },
		sign: { name: 'ECDSA', hash: 'SHA-256' }
	},
	'ec-p384': {
		generate: { name: 'ECDSA', namedCurve: 'P-384' },
		sign: { name: 'ECDSA', hash: 'SHA-384' }
	},
	ed25519: {
		generate: { name: 'Ed25519' },
		sign: { name: 'Ed25519' }
	}
};

export type GenerateOptions = {
	commonName: string;
	organization?: string;
	country?: string;
	keyAlgorithm: KeyAlgorithmChoice;
	validityDays: number;
	/** DNS Subject Alternative Names. */
	sans: string[];
	/** Mark the certificate as a CA (Basic Constraints cA = true). */
	isCa: boolean;
};

export type GeneratedCertificate = {
	certificatePem: string;
	privateKeyPem: string;
};

function webCrypto(): Crypto {
	const crypto = (globalThis as { crypto?: Crypto }).crypto;
	if (!crypto?.subtle) throw new Error('Web Crypto API is not available in this environment.');
	return crypto;
}

/** A random, positive 16-byte serial number as a hex string. */
function randomSerial(crypto: Crypto): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[0] &= 0x7f; // keep the integer positive
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function buildName(opts: GenerateOptions): JsonName {
	const name: JsonName = [{ CN: [opts.commonName] }];
	if (opts.organization?.trim()) name.push({ O: [opts.organization.trim()] });
	if (opts.country?.trim()) name.push({ C: [opts.country.trim().toUpperCase()] });
	return name;
}

/**
 * Generate a self-signed certificate and its private key, both as PEM.
 * Throws an `Error` (e.g. when the browser cannot generate the chosen key).
 */
export async function generateSelfSigned(opts: GenerateOptions): Promise<GeneratedCertificate> {
	if (!opts.commonName.trim()) throw new Error('Le Common Name (CN) est obligatoire.');

	const crypto = webCrypto();
	cryptoProvider.set(crypto);

	const spec = ALGORITHMS[opts.keyAlgorithm];

	let keys: CryptoKeyPair;
	try {
		keys = (await crypto.subtle.generateKey(spec.generate, true, [
			'sign',
			'verify'
		])) as CryptoKeyPair;
	} catch (e) {
		throw new Error(
			`Ce navigateur ne sait pas générer une clé ${KEY_ALGORITHM_LABELS[opts.keyAlgorithm]}.`,
			{ cause: e }
		);
	}

	const notBefore = new Date(Date.now() - 60_000); // 1 min in the past for clock skew
	const notAfter = new Date(notBefore.getTime() + opts.validityDays * 86_400_000);

	const keyUsage = opts.isCa
		? KeyUsageFlags.keyCertSign | KeyUsageFlags.cRLSign
		: KeyUsageFlags.digitalSignature | KeyUsageFlags.keyEncipherment;

	const extensions: Extension[] = [
		new BasicConstraintsExtension(opts.isCa, undefined, true),
		new KeyUsagesExtension(keyUsage, true)
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

	const cert = await X509CertificateGenerator.createSelfSigned({
		serialNumber: randomSerial(crypto),
		name: buildName(opts),
		notBefore,
		notAfter,
		signingAlgorithm: spec.sign,
		keys,
		extensions
	});

	const pkcs8 = await crypto.subtle.exportKey('pkcs8', keys.privateKey);

	return {
		certificatePem: cert.toString('pem'),
		privateKeyPem: derToPem(new Uint8Array(pkcs8), 'PRIVATE KEY')
	};
}
