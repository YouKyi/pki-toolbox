import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

/** A fresh copy of the module: `network` is a singleton that remembers `start()`. */
async function load() {
	vi.resetModules();
	return import('#lib/network.svelte.js');
}

/** Stubs PerformanceObserver; returns what it observed and a way to feed it entries. */
function stubObserver() {
	const observe = vi.fn();
	let emit: (entries: object[]) => void = () => {
		throw new Error('the observer was never constructed');
	};
	vi.stubGlobal(
		'PerformanceObserver',
		class {
			constructor(cb: (list: { getEntries: () => object[] }) => void) {
				emit = (entries) => cb({ getEntries: () => entries });
			}
			observe = observe;
		}
	);
	return { observe, emit: (entries: object[]) => emit(entries) };
}

function stubPolicy(content: string | null) {
	vi.stubGlobal('document', {
		querySelector: () => (content === null ? null : { getAttribute: () => content })
	});
}

describe('connectSrc', () => {
	it('is empty on the server', async () => {
		const { connectSrc } = await load();
		expect(connectSrc()).toBe('');
	});

	it('reads the connect-src directive from the CSP meta tag', async () => {
		const { connectSrc } = await load();
		stubPolicy("default-src 'self'; connect-src 'none'; object-src 'none'");
		expect(connectSrc()).toBe("connect-src 'none'");
	});

	it('is empty when the page carries no policy or no connect-src', async () => {
		const { connectSrc } = await load();
		stubPolicy(null);
		expect(connectSrc()).toBe('');
		stubPolicy("default-src 'self'");
		expect(connectSrc()).toBe('');
	});
});

describe('network watch', () => {
	it('counts only requests able to carry data out, from the mark on', async () => {
		const { network } = await load();
		const observer = stubObserver();
		vi.stubGlobal('performance', { now: () => 100 });

		network.start();
		network.start();
		expect(observer.observe).toHaveBeenCalledOnce();
		expect(observer.observe).toHaveBeenCalledWith({ type: 'resource', buffered: true });

		network.mark();
		expect(network.marked).toBe(true);
		observer.emit([
			{ startTime: 50, initiatorType: 'fetch', name: 'before-mark' },
			{ startTime: 150, initiatorType: 'script', name: 'app.js' },
			{ startTime: 150, initiatorType: 'fetch', name: 'f' },
			{ startTime: 160, initiatorType: 'xmlhttprequest', name: 'x' },
			{ startTime: 170, initiatorType: 'beacon', name: 'b' }
		]);
		expect(network.count).toBe(3);
		expect(network.names).toEqual(['f', 'x', 'b']);

		// Only the last five names are kept, the count keeps going.
		observer.emit(
			['1', '2', '3', '4'].map((name) => ({ startTime: 200, initiatorType: 'fetch', name }))
		);
		expect(network.count).toBe(7);
		expect(network.names).toEqual(['b', '1', '2', '3', '4']);

		network.mark();
		expect(network.count).toBe(0);
		expect(network.names).toEqual([]);
	});

	it('does nothing without PerformanceObserver, and can start once it exists', async () => {
		const { network } = await load();
		vi.stubGlobal('PerformanceObserver', undefined);
		expect(() => network.start()).not.toThrow();

		const observer = stubObserver();
		network.start();
		expect(observer.observe).toHaveBeenCalledOnce();
	});

	it('counts from the start of time when the Performance API is missing', async () => {
		const { network } = await load();
		const observer = stubObserver();
		network.start();
		vi.stubGlobal('performance', undefined);
		network.mark();
		// With a real clock at 100 this entry would predate the mark.
		observer.emit([{ startTime: 5, initiatorType: 'fetch', name: 'early' }]);
		expect(network.count).toBe(1);
		expect(network.names).toEqual(['early']);
	});
});
