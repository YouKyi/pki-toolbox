/**
 * Armoured fixtures for the specs, assembled rather than written out.
 *
 * Detection reads the PEM label and nothing else, so a fixture needs no key
 * material at all. Writing one out anyway put the exact shape of an armoured
 * private key in the repository, which the secret scanner flags, and rightly:
 * silencing it for a test path would blunt it for the paths that matter. The
 * unit fixtures under `tests/` carry real keys because the PKI layer parses
 * them; nothing here parses anything.
 */
export function armour(label: string, body = 'AAAA'): string {
	return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
}

/** A private key as far as the interface is concerned: a label, and no key. */
export const PRIVATE_KEY = armour('PRIVATE KEY');

/** Likewise a revocation list, for the routing that reads its label. */
export const REVOCATION_LIST = armour('X509 CRL');
