import { describe, it, expect } from 'vitest';
import { createDecodeFlow } from '#lib/decodeFlow.svelte.js';
import { carry } from '#lib/handoff.js';

describe('DecodeFlow', () => {
	it('opens on a carried artefact, once', () => {
		carry('CARRIED');
		expect(createDecodeFlow({ run: (s) => s }).input).toBe('CARRIED');
		expect(createDecodeFlow({ run: (s) => s }).input).toBe('');
	});

	it('numbers each flow so error ids never collide', () => {
		const a = createDecodeFlow({ run: (s) => s });
		const b = createDecodeFlow({ run: (s) => s });
		expect(a.errorId).toMatch(/^decode-error-\d+$/);
		expect(a.errorId).not.toBe(b.errorId);
	});

	it('decodes the trimmed input, folds the editor and announces the result', async () => {
		const flow = createDecodeFlow({
			run: async (s) => s.length,
			summary: (n) => `${n} chars`,
			announce: (n) => `Decoded ${n}`
		});
		flow.input = '  abc \n';
		await flow.decode();
		expect(flow.result).toBe(3);
		expect(flow.collapsed).toBe(true);
		expect(flow.loading).toBe(false);
		expect(flow.error).toBe('');
		expect(flow.summary).toBe('3 chars');
		expect(flow.status).toBe('Decoded 3');
	});

	it('stays silent on success without summary or announce', async () => {
		const flow = createDecodeFlow({ run: (s) => s });
		await flow.decode();
		expect(flow.summary).toBe('');
		expect(flow.status).toBe('');
	});

	it('surfaces a failure, unfolds the editor and clears the previous result', async () => {
		let fail = false;
		const flow = createDecodeFlow({
			run: (s) => {
				if (fail) throw new Error('bad input');
				return s;
			}
		});
		await flow.decode();
		expect(flow.collapsed).toBe(true);

		fail = true;
		await flow.decode();
		expect(flow.result).toBeNull();
		expect(flow.collapsed).toBe(false);
		expect(flow.loading).toBe(false);
		expect(flow.error).toBe('bad input');
		expect(flow.failureLabel).toBe('Decoding failed');
		expect(flow.status).toBe('Decoding failed: bad input');
	});

	it('uses the page failure label and stringifies non-Error throws', async () => {
		const flow = createDecodeFlow({
			run: () => {
				throw 'boom';
			},
			failureLabel: 'Parsing failed'
		});
		await flow.decode();
		expect(flow.failureLabel).toBe('Parsing failed');
		expect(flow.status).toBe('Parsing failed: boom');
	});
});
