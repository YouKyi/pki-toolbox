/**
 * Theme state, in three modes: `auto` follows the operating system, `light` and
 * `dark` are explicit choices that outrank it.
 *
 * The brand's default is "light by default, dark as the signature", but that is
 * a statement about the palette, not an instruction to ignore the reader: a
 * user whose machine is set to dark at 2am should not be handed a full-viewport
 * white flash before they can reach a control. So the default mode is `auto`,
 * and choosing is always possible — the mode itself is the state, not the
 * resolved colour, so "follows the system" survives a reload like any other
 * answer.
 *
 * The mode is persisted in `localStorage` and resolved to a `.dark` class on
 * `<html>`; `src/app.html` mirrors this resolution in a pre-paint script so
 * there is no flash on first load.
 */
import { browser } from '$app/environment';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_MODES: ThemeMode[] = ['auto', 'light', 'dark'];

export const THEME_LABEL: Record<ThemeMode, string> = {
	auto: 'Auto',
	light: 'Light',
	dark: 'Dark'
};

/** Icon carried by each mode, in the button and in the menu. */
export const THEME_ICON: Record<ThemeMode, string> = {
	auto: 'contrast',
	light: 'sun',
	dark: 'moon'
};

const STORAGE_KEY = 'pki-toolbox-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Page grounds, kept in step with the `--yk-bg` token of each theme. */
const GROUND: Record<Theme, string> = { light: '#f8f7f4', dark: '#131211' };

class ThemeState {
	/** What the reader asked for. */
	mode = $state<ThemeMode>('auto');
	/** What that resolves to right now. */
	value = $state<Theme>('light');
}

export const theme = new ThemeState();

function systemTheme(): Theme {
	return browser && window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
}

function resolve(mode: ThemeMode): Theme {
	return mode === 'auto' ? systemTheme() : mode;
}

function apply() {
	if (!browser) return;
	theme.value = resolve(theme.mode);
	document.documentElement.classList.toggle('dark', theme.value === 'dark');

	// The browser's own chrome is part of the page. The two `theme-color` tags
	// are media-scoped, so an explicit choice would leave the chrome following
	// the OS while the page followed the reader — a visible seam at the top of
	// the window. Under an explicit choice both tags carry the chosen ground;
	// back on auto, each returns to its own.
	for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
		const own: Theme = meta.media.includes('dark') ? 'dark' : 'light';
		meta.content = theme.mode === 'auto' ? GROUND[own] : GROUND[theme.value];
	}
}

/** Read the persisted mode and apply it. Call once, on first mount. */
export function initTheme(): void {
	if (!browser) return;
	const saved = localStorage.getItem(STORAGE_KEY);
	theme.mode = (THEME_MODES as string[]).includes(saved ?? '') ? (saved as ThemeMode) : 'auto';
	apply();

	// On `auto`, the OS switching mid-session moves the page with it: the reader
	// changed their mind about ambient light, not about this site.
	window.matchMedia?.(DARK_QUERY).addEventListener('change', () => {
		if (theme.mode === 'auto') apply();
	});
}

/** Persist a mode and apply it. */
export function setThemeMode(mode: ThemeMode): void {
	theme.mode = mode;
	if (browser) localStorage.setItem(STORAGE_KEY, mode);
	apply();
}
