/**
 * Certificate issuance signed by an existing CA, entirely in the browser.
 * The CA private key is imported into WebCrypto and never leaves the page.
 */
// @peculiar/x509 v2 requires a Reflect metadata polyfill on the consumer side.
import '@abraham/reflection';
import { X509Certificate, BasicConstraintsExtension, cryptoProvider } from '@peculiar/x509';
import { pemToDer } from './pem';
import { webCrypto } from './generate';

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
