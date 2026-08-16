/**
 * What the page can prove about its own network use.
 *
 * The product's first principle is that the proof beats the promise, and the
 * privacy claim was the one claim it only ever asserted. Two facts make it
 * checkable without a backend and without trusting the sentence: the policy the
 * page was served with, read back from the page itself, and a count of the
 * requests that could have carried an artefact out since the reader handed one
 * over.
 */

/**
 * The initiator types that can send something out. A stylesheet, a script or a
 * font is fetched from this origin and cannot carry a pasted artefact
 * anywhere; `fetch`, `XMLHttpRequest` and `sendBeacon` are the three that
 * could, and they are exactly what `connect-src` governs.
 */
const CARRIERS = new Set(['fetch', 'xmlhttprequest', 'beacon']);

/**
 * The page's own `connect-src`, read from the Content-Security-Policy meta tag
 * SvelteKit emits on every prerendered page. Read, not hardcoded: a string in
 * the source would be one more claim, while this is the policy the browser is
 * actually enforcing on the document the reader is looking at.
 */
export function connectSrc(): string {
	if (typeof document === 'undefined') return '';
	const policy =
		document
			.querySelector('meta[http-equiv="content-security-policy" i]')
			?.getAttribute('content') ?? '';
	return (
		policy
			.split(';')
			.map((directive) => directive.trim())
			.find((directive) => directive.startsWith('connect-src')) ?? ''
	);
}

class NetworkWatch {
	/** Requests able to carry data out, seen since the last mark. */
	count = $state(0);
	/** Their names, so the number is auditable instead of merely reassuring. */
	names = $state<string[]>([]);
	/** True once the reader has handed the page an artefact. */
	marked = $state(false);

	#since = 0;
	#started = false;

	/** Observes once per page; every input may call it. */
	start(): void {
		if (this.#started || typeof PerformanceObserver === 'undefined') return;
		this.#started = true;
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) this.#record(entry as PerformanceResourceTiming);
		}).observe({ type: 'resource', buffered: true });
	}

	/**
	 * Restarts the count from now. The question a reader actually has is not
	 * "has this page ever loaded a font", it is "did what I just pasted go
	 * anywhere", so the count runs from the moment they pasted.
	 */
	mark(): void {
		this.#since = typeof performance === 'undefined' ? 0 : performance.now();
		this.count = 0;
		this.names = [];
		this.marked = true;
	}

	#record(entry: PerformanceResourceTiming): void {
		if (entry.startTime < this.#since) return;
		if (!CARRIERS.has(entry.initiatorType)) return;
		this.count += 1;
		this.names = [...this.names, entry.name].slice(-5);
	}
}

export const network = new NetworkWatch();
