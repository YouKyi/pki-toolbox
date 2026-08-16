/**
 * The state every decode tool repeats, in one place.
 *
 * Each page used to carry the same twenty-five lines: input, result, error,
 * loading, collapsed, the result element, and a `decode()` differing only in
 * the single call to the PKI layer. That duplication is why the behaviour
 * drifted: the conversion page simply never gained the fold, and nothing in
 * the code made the omission visible.
 *
 * The business logic stays in the page. This owns the state machine around it
 * and nothing else: `run` is the page's own decoder, `summary` is how the page
 * names what came out. No parsing, no formatting, no rendering.
 */
import { tick } from 'svelte';
import { revealResult } from './reveal';

export type DecodeFlowOptions<T> = {
	/** The page's own decoder. May be sync or async; throwing produces the error. */
	run: (input: string) => T | Promise<T>;
	/** Names the decoded artefact in the folded recap. */
	summary?: (result: T) => string;
	/** One sentence for assistive technology, on success. */
	announce?: (result: T) => string;
	/** How a failure is announced and titled. Defaults to "Decoding failed". */
	failureLabel?: string;
};

/**
 * `$props.id()` is only available inside a component, so the flow numbers its
 * own. The count runs in the same order on the server and on the client (one
 * flow per page), so the id a prerendered page ships is the id hydration finds.
 */
let sequence = 0;

export class DecodeFlow<T> {
	input = $state('');
	result = $state<T | null>(null);
	error = $state('');
	loading = $state(false);
	/** Folded once decoded, so the answer takes back the viewport. */
	collapsed = $state(false);
	/** The result region, focused after a successful decode. */
	region = $state<HTMLElement | undefined>();

	/** Ties the failure message to the field that caused it. */
	readonly errorId = `decode-error-${++sequence}`;

	#options: DecodeFlowOptions<T>;

	constructor(options: DecodeFlowOptions<T>) {
		this.#options = options;
	}

	get summary(): string {
		return this.result && this.#options.summary ? this.#options.summary(this.result) : '';
	}

	get status(): string {
		const label = this.#options.failureLabel ?? 'Decoding failed';
		if (this.error) return `${label}: ${this.error}`;
		if (this.result && this.#options.announce) return this.#options.announce(this.result);
		return '';
	}

	get failureLabel(): string {
		return this.#options.failureLabel ?? 'Decoding failed';
	}

	async decode(): Promise<void> {
		this.loading = true;
		this.error = '';
		this.result = null;
		try {
			this.result = await this.#options.run(this.input.trim());
			this.collapsed = true;
			// The answer is useless if the reader is still parked on their own
			// base64: hand the keyboard, and the viewport when needed, to the result.
			await tick();
			revealResult(this.region);
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
			this.collapsed = false;
		} finally {
			this.loading = false;
		}
	}
}

export function createDecodeFlow<T>(options: DecodeFlowOptions<T>): DecodeFlow<T> {
	return new DecodeFlow(options);
}
