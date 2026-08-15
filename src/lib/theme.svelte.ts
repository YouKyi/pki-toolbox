/**
 * Dark/light theme state.
 *
 * The brand's default is "light by default, dark as the signature", but that is
 * a statement about the palette, not an instruction to ignore the reader: a
 * user whose machine is set to dark at 2am should not be handed a full-viewport
 * white flash before they can reach a toggle. So the *unset* preference follows
 * the operating system, and an explicit choice always wins over it.
 *
 * The choice is persisted in `localStorage` and reflected as a `.dark` class on
 * `<html>`; `src/app.html` mirrors this resolution in a pre-paint script so
 * there is no flash on first load.
 */
import { browser } from '$app/environment';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'pki-toolbox-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

class ThemeState {
	value = $state<Theme>('light');
	/** True while no explicit choice has been made and the OS decides. */
	followsSystem = $state(true);
}

export const theme = new ThemeState();

function systemTheme(): Theme {
	return browser && window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Page grounds, kept in step with the `--yk-bg` token of each theme. */
const GROUND: Record<Theme, string> = { light: '#f8f7f4', dark: '#131211' };

function apply(value: Theme) {
	if (!browser) return;
	document.documentElement.classList.toggle('dark', value === 'dark');

	// The browser's own chrome is part of the page. The two `theme-color` tags
	// are media-scoped, so an explicit choice would leave the chrome following
	// the OS while the page followed the reader — a visible seam at the top of
	// the window. Under an explicit choice both tags carry the chosen ground;
	// back on system, each returns to its own.
	for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
		const own = meta.media.includes('dark') ? 'dark' : 'light';
		meta.content = theme.followsSystem ? GROUND[own] : GROUND[value];
	}
}

/** Read the persisted preference, or fall back to the OS. Call once, on mount. */
export function initTheme(): void {
	if (!browser) return;
	const saved = localStorage.getItem(STORAGE_KEY);
	theme.followsSystem = saved !== 'dark' && saved !== 'light';
	theme.value = theme.followsSystem ? systemTheme() : (saved as Theme);
	apply(theme.value);

	// While no explicit choice exists, the OS switching mid-session moves the
	// page with it — the reader changed their mind about ambient light, not
	// about this site.
	window.matchMedia?.(DARK_QUERY).addEventListener('change', (event) => {
		if (!theme.followsSystem) return;
		theme.value = event.matches ? 'dark' : 'light';
		apply(theme.value);
	});
}

/** Flip the theme and persist the new choice, which then outranks the OS. */
export function toggleTheme(): void {
	theme.value = theme.value === 'dark' ? 'light' : 'dark';
	theme.followsSystem = false;
	if (browser) localStorage.setItem(STORAGE_KEY, theme.value);
	apply(theme.value);
}
