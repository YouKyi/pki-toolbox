/**
 * Presentation helpers — turn raw parser output into human-readable strings.
 * Pure functions: no DOM, no crypto.
 */

/** Hex-encode bytes, lowercase, no separators. */
export function bytesToHex(data: ArrayBuffer | Uint8Array): string {
	const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
	let out = '';
	for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
	return out;
}

/** Group a hex string into uppercase colon-separated byte pairs (`AB:CD:…`). */
export function hexWithColons(hex: string): string {
	const clean = hex.replace(/[^0-9a-fA-F]/g, '');
	const padded = clean.length % 2 === 1 ? '0' + clean : clean;
	return (padded.match(/.{2}/g) ?? []).join(':').toUpperCase();
}

/** Format a certificate serial number (peculiar returns it as a hex string). */
export function formatSerial(serial: string): string {
	const dec = (() => {
		try {
			return BigInt('0x' + serial).toString(10);
		} catch {
			return null;
		}
	})();
	const hex = hexWithColons(serial);
	return dec ? `${hex}  (${dec})` : hex;
}

/** Structured description of a public-key algorithm. */
export type KeyAlgorithmInfo = {
	/** Family name: `RSA`, `EC`, `Ed25519`, … */
	family: string;
	/** Modulus length in bits for RSA. */
	bits?: number;
	/** Named curve for EC keys. */
	curve?: string;
	/** Ready-to-display label. */
	label: string;
};

type LooseAlgorithm = {
	name?: string;
	modulusLength?: number;
	namedCurve?: string;
	hash?: { name?: string } | string;
};

/** Humanise a public-key algorithm object as exposed by `publicKey.algorithm`. */
export function humanKeyAlgorithm(algorithm: unknown): KeyAlgorithmInfo {
	const algo = (algorithm ?? {}) as LooseAlgorithm;
	const name = algo.name ?? 'Unknown';

	if (/rsa/i.test(name)) {
		const bits = algo.modulusLength;
		return { family: 'RSA', bits, label: bits ? `RSA ${bits}-bit` : 'RSA' };
	}
	if (/ec(dsa|dh)?$/i.test(name) || algo.namedCurve) {
		const curve = algo.namedCurve;
		return { family: 'EC', curve, label: curve ? `EC (${curve})` : 'EC' };
	}
	if (/ed(25519|448)/i.test(name)) {
		return { family: name, label: name };
	}
	return { family: name, label: name };
}

/** Humanise a signature algorithm object as exposed by `signatureAlgorithm`. */
export function humanSignatureAlgorithm(algorithm: unknown): string {
	const algo = (algorithm ?? {}) as LooseAlgorithm;
	const name = algo.name ?? 'Unknown';
	const hash = typeof algo.hash === 'string' ? algo.hash : algo.hash?.name;

	if (/ed(25519|448)/i.test(name)) return name;
	if (!hash) return name;

	const family = /rsa-pss/i.test(name)
		? 'RSA-PSS'
		: /rsa/i.test(name)
			? 'RSA'
			: /ec(dsa)?/i.test(name)
				? 'ECDSA'
				: name;
	return `${hash} with ${family}`;
}

/** Format a date in a compact, locale-independent UTC form. */
export function formatDate(date: Date): string {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'Invalid date';
	return date
		.toISOString()
		.replace('T', ' ')
		.replace(/\.\d+Z$/, ' UTC');
}

/** Whole days between two dates (b − a), rounded down. */
export function daysBetween(a: Date, b: Date): number {
	return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}
