/**
 * Generates the EC certificate chain and CSR used as sample data and test
 * fixtures. Run once with `node scripts/generate-fixtures.mjs`; the printed
 * PEM blocks are pasted into `src/lib/samples.ts`.
 *
 * The ISRG Root X1 / X2 fixtures are real public certificates and are not
 * generated here.
 */
import * as x509 from '@peculiar/x509';

const crypto = globalThis.crypto;
x509.cryptoProvider.set(crypto);

const NOT_BEFORE = new Date('2024-01-01T00:00:00Z');
const NOT_AFTER = new Date('2044-01-01T00:00:00Z');

function ecKeys(namedCurve) {
	return crypto.subtle.generateKey({ name: 'ECDSA', namedCurve }, false, ['sign', 'verify']);
}

function san(...dns) {
	return new x509.SubjectAlternativeNameExtension(dns.map((value) => ({ type: 'dns', value })));
}

async function main() {
	// --- Root CA (P-384, self-signed) ---
	const rootKeys = await ecKeys('P-384');
	const root = await x509.X509CertificateGenerator.createSelfSigned({
		serialNumber: '01',
		name: 'CN=pki-toolbox Test Root CA, O=pki-toolbox, C=FR',
		notBefore: NOT_BEFORE,
		notAfter: NOT_AFTER,
		signingAlgorithm: { name: 'ECDSA', hash: 'SHA-384' },
		keys: rootKeys,
		extensions: [
			new x509.BasicConstraintsExtension(true, undefined, true),
			new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true)
		]
	});

	// --- Intermediate CA (P-256, signed by root) ---
	const interKeys = await ecKeys('P-256');
	const inter = await x509.X509CertificateGenerator.create({
		serialNumber: '02',
		subject: 'CN=pki-toolbox Test Intermediate CA, O=pki-toolbox, C=FR',
		issuer: root.subject,
		notBefore: NOT_BEFORE,
		notAfter: NOT_AFTER,
		signingAlgorithm: { name: 'ECDSA', hash: 'SHA-384' },
		publicKey: interKeys.publicKey,
		signingKey: rootKeys.privateKey,
		extensions: [
			new x509.BasicConstraintsExtension(true, 0, true),
			new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true)
		]
	});

	// --- Leaf certificate (P-256, signed by intermediate) ---
	const leafKeys = await ecKeys('P-256');
	const leaf = await x509.X509CertificateGenerator.create({
		serialNumber: '03',
		subject: 'CN=demo.pki-toolbox.test, O=pki-toolbox, C=FR',
		issuer: inter.subject,
		notBefore: NOT_BEFORE,
		notAfter: NOT_AFTER,
		signingAlgorithm: { name: 'ECDSA', hash: 'SHA-256' },
		publicKey: leafKeys.publicKey,
		signingKey: interKeys.privateKey,
		extensions: [
			new x509.BasicConstraintsExtension(false, undefined, false),
			new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature, true),
			new x509.ExtendedKeyUsageExtension(['1.3.6.1.5.5.7.3.1', '1.3.6.1.5.5.7.3.2'], false),
			san('demo.pki-toolbox.test', 'www.demo.pki-toolbox.test')
		]
	});

	// --- CSR (P-256) ---
	const csrKeys = await ecKeys('P-256');
	const csr = await x509.Pkcs10CertificateRequestGenerator.create({
		name: 'CN=request.pki-toolbox.test, O=pki-toolbox, C=FR',
		keys: csrKeys,
		signingAlgorithm: { name: 'ECDSA', hash: 'SHA-256' },
		extensions: [san('request.pki-toolbox.test', 'api.request.pki-toolbox.test')]
	});

	console.log('// ===== LEAF =====');
	console.log(leaf.toString('pem'));
	console.log('// ===== INTERMEDIATE =====');
	console.log(inter.toString('pem'));
	console.log('// ===== ROOT =====');
	console.log(root.toString('pem'));
	console.log('// ===== CSR =====');
	console.log(csr.toString('pem'));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
