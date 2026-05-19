/**
 * Object identifier dictionaries. Kept deliberately small and extensible —
 * add an entry here whenever a tool needs to humanise a new OID.
 */

/** Extended Key Usage purposes (RFC 5280 §4.2.1.12 and common extensions). */
export const EXTENDED_KEY_USAGE: Record<string, string> = {
	'1.3.6.1.5.5.7.3.1': 'serverAuth',
	'1.3.6.1.5.5.7.3.2': 'clientAuth',
	'1.3.6.1.5.5.7.3.3': 'codeSigning',
	'1.3.6.1.5.5.7.3.4': 'emailProtection',
	'1.3.6.1.5.5.7.3.8': 'timeStamping',
	'1.3.6.1.5.5.7.3.9': 'OCSPSigning',
	'2.5.29.37.0': 'anyExtendedKeyUsage'
};

/** X.509 v3 extension OIDs, used to label extensions we do not decode fully. */
export const EXTENSION_NAMES: Record<string, string> = {
	'2.5.29.14': 'Subject Key Identifier',
	'2.5.29.15': 'Key Usage',
	'2.5.29.17': 'Subject Alternative Name',
	'2.5.29.18': 'Issuer Alternative Name',
	'2.5.29.19': 'Basic Constraints',
	'2.5.29.31': 'CRL Distribution Points',
	'2.5.29.32': 'Certificate Policies',
	'2.5.29.35': 'Authority Key Identifier',
	'2.5.29.37': 'Extended Key Usage',
	'1.3.6.1.5.5.7.1.1': 'Authority Information Access',
	'1.3.6.1.4.1.11129.2.4.2': 'SCT List'
};

/** Resolve an Extended Key Usage OID to a human name, falling back to the OID. */
export function ekuName(oid: string): string {
	return EXTENDED_KEY_USAGE[oid] ?? oid;
}

/** Resolve an extension OID to a human name, falling back to the OID. */
export function extensionName(oid: string): string {
	return EXTENSION_NAMES[oid] ?? oid;
}
