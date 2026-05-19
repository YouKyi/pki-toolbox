/**
 * Dark/light theme state. Dark is the default; the choice is persisted in
 * `localStorage` and reflected as a `.dark` class on `<html>`.
 */
import { browser } from '$app/environment';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'pki-toolbox-theme';

class ThemeState {
	value = $state<Theme>('dark');
}

export const theme = new ThemeState();

function apply(value: Theme) {
	if (browser) document.documentElement.classList.toggle('dark', value === 'dark');
}

/** Read the persisted preference and apply it. Call once, on first mount. */
export function initTheme(): void {
	if (!browser) return;
	const saved = localStorage.getItem(STORAGE_KEY);
	theme.value = saved === 'light' ? 'light' : 'dark';
	apply(theme.value);
}

/** Flip the theme and persist the new choice. */
export function toggleTheme(): void {
	theme.value = theme.value === 'dark' ? 'light' : 'dark';
	if (browser) localStorage.setItem(STORAGE_KEY, theme.value);
	apply(theme.value);
}
