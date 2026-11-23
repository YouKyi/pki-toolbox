import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/env', () => ({ browser: true }));

const { theme, initTheme, setThemeMode } = await import('#lib/theme.svelte.js');

/** A minimal browser: storage, the dark-mode query, `<html>` and two theme-color tags. */
function stubBrowser(saved: string | null, systemDark: boolean) {
	const store = new Map<string, string>(saved === null ? [] : [['pki-toolbox-theme', saved]]);
	const query = { matches: systemDark, listener: () => {} };
	const metas = [
		{ media: '(prefers-color-scheme: light)', content: '' },
		{ media: '(prefers-color-scheme: dark)', content: '' }
	];
	const classes = new Set<string>();
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => store.set(k, v)
	});
	vi.stubGlobal('window', {
		matchMedia: () => ({
			get matches() {
				return query.matches;
			},
			addEventListener: (_: string, fn: () => void) => (query.listener = fn)
		})
	});
	vi.stubGlobal('document', {
		documentElement: {
			classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) }
		},
		querySelectorAll: () => metas
	});
	return { store, query, metas, classes };
}

beforeEach(() => {
	theme.mode = 'auto';
	theme.value = 'light';
});
afterEach(() => vi.unstubAllGlobals());

describe('theme', () => {
	it('follows the OS on auto, including a switch mid-session', () => {
		const b = stubBrowser(null, true);
		initTheme();
		expect(theme.mode).toBe('auto');
		expect(theme.value).toBe('dark');
		expect(b.classes.has('dark')).toBe(true);
		// On auto each theme-color tag keeps its own ground.
		expect(b.metas.map((m) => m.content)).toEqual(['#f8f7f4', '#131211']);

		b.query.matches = false;
		b.query.listener();
		expect(theme.value).toBe('light');
		expect(b.classes.has('dark')).toBe(false);
	});

	it('restores a saved explicit choice and ignores the OS for it', () => {
		const b = stubBrowser('light', true);
		initTheme();
		expect(theme.mode).toBe('light');
		expect(theme.value).toBe('light');
		expect(b.metas.map((m) => m.content)).toEqual(['#f8f7f4', '#f8f7f4']);

		b.query.listener();
		expect(theme.value).toBe('light');
	});

	it('falls back to auto on a corrupted stored value', () => {
		stubBrowser('purple', false);
		initTheme();
		expect(theme.mode).toBe('auto');
	});

	it('persists and applies a chosen mode', () => {
		const b = stubBrowser(null, false);
		setThemeMode('dark');
		expect(b.store.get('pki-toolbox-theme')).toBe('dark');
		expect(theme.value).toBe('dark');
		expect(b.metas.map((m) => m.content)).toEqual(['#131211', '#131211']);
	});
});

describe('theme on the server', () => {
	// Restored even when an assertion fails, so no other test inherits the mock.
	afterEach(() => {
		vi.doUnmock('$app/env');
		vi.resetModules();
	});

	it('keeps its defaults and touches no browser API', async () => {
		vi.resetModules();
		vi.doMock('$app/env', () => ({ browser: false }));
		const server = await import('#lib/theme.svelte.js');
		const getItem = vi.fn();
		vi.stubGlobal('localStorage', { getItem, setItem: getItem });

		server.initTheme();
		server.setThemeMode('dark');
		expect(server.theme.mode).toBe('dark');
		expect(server.theme.value).toBe('light');
		expect(getItem).not.toHaveBeenCalled();
	});
});
