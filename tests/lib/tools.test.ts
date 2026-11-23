import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { categories, tools, toolBySlug, requireTool, toolsByCategory } from '#lib/tools.js';

const ROUTES = new URL('../../src/routes/', import.meta.url);

describe('tool catalogue', () => {
	it('has unique slugs, each backed by a route page', () => {
		const slugs = tools.map((t) => t.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const slug of slugs)
			expect(existsSync(new URL(`${slug}/+page.svelte`, ROUTES))).toBe(true);
	});

	it('lists every route directory in the catalogue', () => {
		const routes = readdirSync(ROUTES, { withFileTypes: true })
			.filter((d) => d.isDirectory())
			.map((d) => d.name);
		expect(routes.sort()).toEqual(tools.map((t) => t.slug).sort());
	});

	it('files every tool under a known category, none left empty', () => {
		const ids = categories.map((c) => c.id);
		for (const tool of tools) expect(ids).toContain(tool.category);
		for (const id of ids) expect(toolsByCategory(id).length).toBeGreaterThan(0);
		expect(categories.flatMap((c) => toolsByCategory(c.id))).toHaveLength(tools.length);
	});

	it('finds a tool by slug, and refuses an unknown one', () => {
		expect(toolBySlug('decode-crl')?.name).toBe('CRL decoder');
		expect(toolBySlug('nope')).toBeUndefined();
		expect(requireTool('asn1-viewer').slug).toBe('asn1-viewer');
		expect(() => requireTool('nope')).toThrowError('Unknown tool slug: nope');
	});
});
