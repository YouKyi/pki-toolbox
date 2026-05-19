/**
 * Clipboard helper — thin wrapper around the Clipboard API so callers do not
 * need to repeat the try/catch boilerplate.
 *
 * Reactive "copied" indicator state (per-item id, 1200 ms reset) is intentionally
 * kept in each route component: sharing it would require a store or context that
 * is more complex than the duplication it saves.
 */

/**
 * Write `text` to the system clipboard.
 * Returns `true` on success, `false` when the Clipboard API is unavailable or
 * the user denied the permission (e.g. in a non-secure context).
 */
export async function writeToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
