import { describe, it, expect, vi, afterEach } from 'vitest';
import { connectSrc, network } from '#lib/network.svelte.js';

afterEach(() => vi.unstubAllGlobals());

function stubPolicy(content: string | null) {
	vi.stubGlobal('document', {
		querySelector: () => (content === null ? null : { getAttribute: () => content })
	});
}

describe('connectSrc', () => {
	it('is empty on the server', () => {
		expect(connectSrc()).toBe('');
	});

	it('reads the connect-src directive from the CSP meta tag', () => {
		stubPolicy("default-src 'self'; connect-src 'none'; object-src 'none'");
		expect(connectSrc()).toBe("connect-src 'none'");
	});

	it('is empty when the page carries no policy or no connect-src', () => {
		stubPolicy(null);
		expect(connectSrc()).toBe('');
		stubPolicy("default-src 'self'");
		expect(connectSrc()).toBe('');
	});
});

describe('network watch', () => {
	it('counts only requests able to carry data out, from the mark on', () => {
		let emit: (entries: object[]) => void = () => {};
		const observe = vi.fn();
		vi.stubGlobal(
			'PerformanceObserver',
			class {
				constructor(cb: (list: { getEntries: () => object[] }) => void) {
					emit = (entries) => cb({ getEntries: () => entries });
				}
				observe = observe;
			}
		);
		vi.stubGlobal('performance', { now: () => 100 });

		network.start();
		network.start();
		expect(observe).toHaveBeenCalledOnce();
		expect(observe).toHaveBeenCalledWith({ type: 'resource', buffered: true });

		network.mark();
		expect(network.marked).toBe(true);
		emit([
			{ startTime: 50, initiatorType: 'fetch', name: 'before-mark' },
			{ startTime: 150, initiatorType: 'script', name: 'app.js' },
			{ startTime: 150, initiatorType: 'fetch', name: 'f' },
			{ startTime: 160, initiatorType: 'xmlhttprequest', name: 'x' },
			{ startTime: 170, initiatorType: 'beacon', name: 'b' }
		]);
		expect(network.count).toBe(3);
		expect(network.names).toEqual(['f', 'x', 'b']);

		// Only the last five names are kept, the count keeps going.
		emit(['1', '2', '3', '4'].map((name) => ({ startTime: 200, initiatorType: 'fetch', name })));
		expect(network.count).toBe(7);
		expect(network.names).toEqual(['b', '1', '2', '3', '4']);

		network.mark();
		expect(network.count).toBe(0);
		expect(network.names).toEqual([]);
	});
});

describe('network mark without the Performance API', () => {
	it('counts from the start of time', () => {
		vi.stubGlobal('performance', undefined);
		network.mark();
		expect(network.marked).toBe(true);
		expect(network.count).toBe(0);
	});
});
