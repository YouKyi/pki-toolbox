/** Sticky chrome height plus a breath, mirrored from `scroll-padding-top`. */
const CHROME = 80;

/**
 * Hands the keyboard and, only when needed, the viewport to a freshly rendered
 * result.
 *
 * The focus move is unconditional: it is what lets a keyboard user carry on
 * from the answer instead of from the top of the page, and what gives a screen
 * reader somewhere to land. The scroll is not — a plain `focus()` scrolls every
 * time, which yanks the page even when the result was already on screen.
 *
 * The visibility test is written by hand rather than delegated to
 * `scrollIntoView({ block: 'nearest' })`: a result is routinely taller than the
 * viewport, and for an element that cannot fit, "nearest" still aligns its top,
 * so it scrolls exactly in the case we are trying to avoid. What matters is
 * whether the START of the result is readable, not whether all of it fits.
 */
export function revealResult(el: HTMLElement | undefined): void {
	if (!el) return;
	el.focus({ preventScroll: true });

	const { top } = el.getBoundingClientRect();
	const hiddenUnderChrome = top < CHROME;
	const belowTheFold = top > window.innerHeight - CHROME;
	if (!hiddenUnderChrome && !belowTheFold) return;

	const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
	el.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
}
