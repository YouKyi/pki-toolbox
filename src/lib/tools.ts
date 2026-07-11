/**
 * Single source of truth for the tool catalogue. The navbar and the home
 * grid both read from this registry.
 */

export type ToolCategory = 'decode' | 'inspect' | 'convert' | 'generate';
export type ToolStatus = 'ready' | 'beta' | 'planned';

export type Tool = {
	/** URL slug, also the route path (`/<slug>`). */
	slug: string;
	name: string;
	description: string;
	/** Icon name understood by `Icon.svelte`. */
	icon: string;
	category: ToolCategory;
	status: ToolStatus;
};

/** Display metadata for each category, in navbar order. */
export const categories: { id: ToolCategory; label: string }[] = [
	{ id: 'decode', label: 'Decoding' },
	{ id: 'inspect', label: 'Inspection' },
	{ id: 'convert', label: 'Conversion' },
	{ id: 'generate', label: 'Generation' }
];

export const tools: Tool[] = [
	{
		slug: 'decode-certificate',
		name: 'Certificate decoder',
		description:
			'Inspect every field of an X.509 certificate: subject, issuer, validity, SANs, key usage and fingerprints.',
		icon: 'certificate',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'decode-csr',
		name: 'CSR decoder',
		description:
			'Decode a PKCS#10 signing request: subject, public key, signature algorithm and requested extensions.',
		icon: 'file-text',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'decode-chain',
		name: 'Chain decoder',
		description:
			'Split a concatenated PEM bundle into an ordered chain and verify every issuer-to-subject link.',
		icon: 'link',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'fingerprint',
		name: 'Fingerprints',
		description: "Compute the SHA-1, SHA-256 and SHA-512 fingerprints of a certificate's DER.",
		icon: 'fingerprint',
		category: 'inspect',
		status: 'ready'
	},
	{
		slug: 'decode-crl',
		name: 'CRL decoder',
		description: 'Certificate Revocation List: revoked entries, dates and reasons.',
		icon: 'ban',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'decode-pkcs7',
		name: 'PKCS#7 decoder',
		description: 'Inspect PKCS#7 / CMS bundles and the certificates they carry.',
		icon: 'package',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'decode-pkcs12',
		name: 'PKCS#12 decoder',
		description: 'Open password-protected .p12 / .pfx files.',
		icon: 'lock',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'asn1-viewer',
		name: 'ASN.1 viewer',
		description: 'Raw, expandable ASN.1 tree of any DER-encoded artefact.',
		icon: 'tree',
		category: 'inspect',
		status: 'ready'
	},
	{
		slug: 'format-convert',
		name: 'Format conversion',
		description: 'Convert PKI artefacts between PEM, DER and PKCS#7.',
		icon: 'convert',
		category: 'convert',
		status: 'ready'
	},
	{
		slug: 'generate-selfsigned',
		name: 'Self-signed certificate',
		description: 'Generate a self-signed certificate via WebCrypto, entirely in the browser.',
		icon: 'sparkles',
		category: 'generate',
		status: 'ready'
	},
	{
		slug: 'sign-certificate',
		name: 'Sign from a CA',
		description:
			'Issue a certificate signed by an existing CA: new key pair or CSR, leaf or intermediate CA, with a ready-to-use fullchain.',
		icon: 'stamp',
		category: 'generate',
		status: 'ready'
	}
];

/** Find a tool by its slug. */
export function toolBySlug(slug: string): Tool | undefined {
	return tools.find((t) => t.slug === slug);
}

/** Find a tool by slug, throwing when it is missing (use for known slugs). */
export function requireTool(slug: string): Tool {
	const tool = toolBySlug(slug);
	if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
	return tool;
}

/** Tools belonging to a category, in registry order. */
export function toolsByCategory(category: ToolCategory): Tool[] {
	return tools.filter((t) => t.category === category);
}
