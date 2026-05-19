/**
 * PEM fixtures for the unit tests.
 *
 * The artefacts themselves live in `src/lib/samples.ts` (they double as the
 * in-app "Charger un exemple" data); this module re-exports them so the tests
 * have a single, stable source of fixture data.
 */
export {
	ISRG_ROOT_X1,
	ISRG_ROOT_X2,
	TEST_LEAF,
	TEST_INTERMEDIATE,
	TEST_ROOT,
	TEST_CSR,
	TEST_CHAIN,
	TEST_CRL,
	TEST_PKCS7,
	TEST_PKCS12,
	TEST_PKCS12_PASSWORD
} from '$lib/samples';

/** Known-good SHA-256 fingerprint of ISRG Root X1 (lowercase hex, no colons). */
export const ISRG_ROOT_X1_SHA256 =
	'96bcec06264976f37460779acf28c5a7cfe8a3c0aae11a8ffcee05c0bddf08c6';
