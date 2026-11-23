/**
 * The small browser helpers, run under Node with only the globals each one
 * touches stubbed out.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { carry, takeCarried } from '#lib/handoff.js';
import { writeToClipboard } from '#lib/clipboard.js';
import { downloadBytes, downloadText } from '#lib/download.js';
import { revealResult } from '#lib/reveal.js';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('handoff', () => {
	it('hands an artefact over exactly once', () => {
		expect(takeCarried()).toBe('');
		carry('PEM');
		expect(takeCarried()).toBe('PEM');
		expect(takeCarried()).toBe('');
	});
});

describe('writeToClipboard', () => {
	it('reports success when the Clipboard API accepts the text', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		expect(await writeToClipboard('abc')).toBe(true);
		expect(writeText).toHaveBeenCalledWith('abc');
	});

	it('reports failure when permission is denied', async () => {
		vi.stubGlobal('navigator', {
			clipboard: { writeText: vi.fn().mockRejectedValue(new Error()) }
		});
		expect(await writeToClipboard('abc')).toBe(false);
	});

	it('reports failure when the Clipboard API is missing', async () => {
		vi.stubGlobal('navigator', {});
		expect(await writeToClipboard('abc')).toBe(false);
	});
});

describe('download', () => {
	function stubDom() {
		const link = { href: '', download: '', click: vi.fn() };
		const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:x');
		const revokeObjectURL = vi.fn();
		vi.stubGlobal('document', { createElement: vi.fn(() => link) });
		vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
		return { link, createObjectURL, revokeObjectURL };
	}

	it('clicks a blob link and frees the URL only later', () => {
		vi.useFakeTimers();
		const { link, createObjectURL, revokeObjectURL } = stubDom();
		downloadBytes('a.der', new Uint8Array([1, 2]));
		expect(link).toMatchObject({ href: 'blob:x', download: 'a.der' });
		expect(link.click).toHaveBeenCalledOnce();
		expect(createObjectURL.mock.calls[0][0].type).toBe('application/octet-stream');
		vi.advanceTimersByTime(29_999);
		expect(revokeObjectURL).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
	});

	it('encodes text as UTF-8 under the given MIME type', async () => {
		const { createObjectURL } = stubDom();
		downloadText('a.pem', 'é', 'application/x-pem-file');
		const blob = createObjectURL.mock.calls[0][0];
		expect(blob.type).toBe('application/x-pem-file');
		expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([0xc3, 0xa9]);
	});
});

describe('revealResult', () => {
	function element(top: number) {
		return { focus: vi.fn(), scrollIntoView: vi.fn(), getBoundingClientRect: () => ({ top }) };
	}

	function stubWindow(reduced: boolean) {
		vi.stubGlobal('window', {
			innerHeight: 800,
			matchMedia: () => ({ matches: reduced })
		});
	}

	it('does nothing without an element', () => {
		expect(() => revealResult(undefined)).not.toThrow();
	});

	it('focuses without scrolling when the start of the result is on screen', () => {
		stubWindow(false);
		const el = element(300);
		revealResult(el as unknown as HTMLElement);
		expect(el.focus).toHaveBeenCalledWith({ preventScroll: true });
		expect(el.scrollIntoView).not.toHaveBeenCalled();
	});

	it('scrolls smoothly to a result below the fold', () => {
		stubWindow(false);
		const el = element(780);
		revealResult(el as unknown as HTMLElement);
		expect(el.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
	});

	it('treats a browser without matchMedia as motion-tolerant', () => {
		vi.stubGlobal('window', { innerHeight: 800 });
		const el = element(900);
		revealResult(el as unknown as HTMLElement);
		expect(el.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
	});

	it('jumps without animation under reduced motion, also when hidden under the chrome', () => {
		stubWindow(true);
		const el = element(10);
		revealResult(el as unknown as HTMLElement);
		expect(el.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
	});
});
