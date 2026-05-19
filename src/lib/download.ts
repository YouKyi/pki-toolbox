/**
 * Tiny client-side download helpers. Everything stays in the browser, the
 * bytes are turned into a Blob URL and never leave the page.
 */

/** Trigger a download of raw bytes under `filename`. */
export function downloadBytes(
	filename: string,
	bytes: Uint8Array,
	mime = 'application/octet-stream'
): void {
	const blob = new Blob([bytes as BlobPart], { type: mime });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	// Revoke later: some browsers abort the download if the URL is freed too soon.
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Trigger a download of a text file under `filename`. */
export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
	downloadBytes(filename, new TextEncoder().encode(text), mime);
}
