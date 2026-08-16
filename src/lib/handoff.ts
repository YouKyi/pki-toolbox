/**
 * Carrying an artefact from one tool to another, in memory.
 *
 * Three tools, three pastes, one artefact was the state of things: decode a
 * certificate, then re-paste the same PEM by hand to see its ASN.1 tree. The
 * obvious fix would be a query string, and the product forbids it: an artefact
 * in a URL is an artefact in a history file, in a proxy log, in a bookmark
 * sync. So the handoff lives in a module variable, survives exactly one
 * client-side navigation, and dies with the tab.
 */
let pending: string | null = null;

/** Hands an artefact to the next tool. Call right before navigating. */
export function carry(artefact: string): void {
	pending = artefact;
}

/** Takes what was carried, once. Returns an empty string when nothing was. */
export function takeCarried(): string {
	const artefact = pending ?? '';
	pending = null;
	return artefact;
}
