import { test, expect } from '@playwright/test';

/**
 * Responsive guard: at a phone width, no rendered content may be clipped.
 *
 * The tools print long unbreakable strings (hex fingerprints, DNs, serials,
 * base64). Two CSS defaults conspire to clip them: a `1fr` grid track and a
 * grid/flex item both resolve `min-width` to `auto`, so a long value cannot
 * shrink below its min-content and overflows — and because the certificate card
 * is `overflow-hidden`, the overflow is *clipped*, not scrollable, i.e. silently
 * unreadable. This spec fails if that ever comes back.
 *
 * An element counts as clipped when its content is wider than its box
 * (scrollWidth > clientWidth) AND it is not inside a horizontally scrollable
 * ancestor. Deliberate clipping (the visually-hidden skip link, ellipsised
 * `truncate` titles) is excluded.
 */

const PHONE = { width: 390, height: 850 };

const PAGES: [string, string][] = [
	['/decode-certificate', 'Decode'],
	['/decode-csr', 'Decode'],
	['/decode-chain', 'Decode the chain'],
	['/decode-crl', 'Decode'],
	['/decode-pkcs7', 'Decode'],
	['/fingerprint', 'Compute fingerprints'],
	['/format-convert', 'Convert'],
	['/asn1-viewer', 'Parse'],
	['/generate-selfsigned', 'Generate the certificate']
];

for (const [path, action] of PAGES) {
	test(`no clipped content at ${PHONE.width}px — ${path}`, async ({ page }) => {
		await page.setViewportSize(PHONE);
		await page.goto(path);

		// Every tool but the generator offers a deterministic sample.
		const load = page.getByRole('button', { name: 'Load an example' });
		if (await load.count()) await load.click();
		await page.getByRole('button', { name: action }).click();

		// Wait for the tool to actually render something before measuring.
		await expect(page.locator('[aria-live="polite"]')).not.toBeEmpty({ timeout: 20000 });

		const report = await page.evaluate(() => {
			const doc = document.documentElement;
			/** True when the element or an ancestor can be scrolled horizontally. */
			const inScroller = (el: HTMLElement) => {
				for (let n: HTMLElement | null = el; n; n = n.parentElement) {
					const ox = getComputedStyle(n).overflowX;
					if (ox === 'auto' || ox === 'scroll') return true;
				}
				return false;
			};

			const clipped: string[] = [];
			for (const node of Array.from(document.querySelectorAll('body *'))) {
				const el = node as HTMLElement;
				if (el.clientWidth === 0 || el.scrollWidth <= el.clientWidth + 1) continue;
				if (inScroller(el)) continue; // reachable by scrolling
				const cls = (el.className || '').toString();
				if (cls.includes('sr-only') || cls.includes('truncate')) continue; // clipped by design
				clipped.push(
					`<${el.tagName.toLowerCase()} class="${cls.slice(0, 60)}"> ` +
						`${el.scrollWidth}px content in ${el.clientWidth}px box — ` +
						`"${(el.textContent || '').trim().slice(0, 40)}"`
				);
			}
			return {
				horizontalPageScroll: doc.scrollWidth > doc.clientWidth,
				clipped
			};
		});

		expect(report.clipped, `clipped content on ${path}`).toEqual([]);
		expect(report.horizontalPageScroll, `page scrolls horizontally on ${path}`).toBe(false);
	});
}
