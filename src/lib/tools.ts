/**
 * Single source of truth for the tool catalogue. The sidebar, the home grid
 * and the "coming soon" pages all read from this registry.
 */

export type ToolCategory = 'decode' | 'inspect' | 'convert' | 'generate';
export type ToolStatus = 'ready' | 'beta' | 'planned';

export type Tool = {
	/** URL slug — also the route path (`/<slug>`). */
	slug: string;
	name: string;
	description: string;
	/** Icon name understood by `Icon.svelte`. */
	icon: string;
	category: ToolCategory;
	status: ToolStatus;
};

/** Display metadata for each category, in sidebar order. */
export const categories: { id: ToolCategory; label: string }[] = [
	{ id: 'decode', label: 'Décodage' },
	{ id: 'inspect', label: 'Inspection' },
	{ id: 'convert', label: 'Conversion' },
	{ id: 'generate', label: 'Génération' }
];

export const tools: Tool[] = [
	{
		slug: 'decode-certificate',
		name: 'Décodeur de certificat',
		description:
			"Inspecte tous les champs d'un certificat X.509 : sujet, émetteur, validité, SAN, key usage et empreintes.",
		icon: 'certificate',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'decode-csr',
		name: 'Décodeur de CSR',
		description:
			'Décode une demande de signature PKCS#10 : sujet, clé publique, algorithme de signature et extensions demandées.',
		icon: 'file-text',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'decode-chain',
		name: 'Décodeur de chaîne',
		description:
			'Sépare un bundle PEM concaténé en chaîne ordonnée et vérifie chaque lien émetteur ↔ sujet.',
		icon: 'link',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'fingerprint',
		name: 'Empreintes',
		description: "Calcule les empreintes SHA-1, SHA-256 et SHA-512 du DER d'un certificat.",
		icon: 'fingerprint',
		category: 'inspect',
		status: 'ready'
	},
	{
		slug: 'decode-crl',
		name: 'Décodeur de CRL',
		description: 'Liste de révocation de certificats : entrées révoquées, dates et raisons.',
		icon: 'ban',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'decode-pkcs7',
		name: 'Décodeur PKCS#7',
		description: "Inspecte les bundles PKCS#7 / CMS et les certificats qu'ils transportent.",
		icon: 'package',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'decode-pkcs12',
		name: 'Décodeur PKCS#12',
		description: 'Ouvre les fichiers .p12 / .pfx protégés par mot de passe.',
		icon: 'lock',
		category: 'decode',
		status: 'ready'
	},
	{
		slug: 'asn1-viewer',
		name: 'Visualiseur ASN.1',
		description: "Arbre ASN.1 brut et dépliable de n'importe quel artefact encodé en DER.",
		icon: 'tree',
		category: 'inspect',
		status: 'ready'
	},
	{
		slug: 'format-convert',
		name: 'Conversion de format',
		description: 'Convertit les artefacts PKI entre PEM, DER et PKCS#7.',
		icon: 'convert',
		category: 'convert',
		status: 'ready'
	},
	{
		slug: 'generate-selfsigned',
		name: 'Certificat auto-signé',
		description: 'Génère un certificat auto-signé via WebCrypto, entièrement dans le navigateur.',
		icon: 'sparkles',
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
