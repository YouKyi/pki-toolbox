<script module lang="ts">
	export type BadgeTone =
		| 'neutral'
		| 'accent'
		| 'ready'
		| 'beta'
		| 'planned'
		| 'valid'
		| 'expired'
		| 'pending'
		| 'warn'
		| 'info'
		| 'leaf'
		| 'intermediate'
		| 'root';

	/**
	 * DA v2 · le badge est un jeton NEUTRE ; le statut se lit à sa pastille de
	 * 6px et à son libellé, jamais à un fond teinté. La charte ne connaît que
	 * deux marqueurs colorés : l'orange (signal, alerte, mise en avant) et le
	 * vert de conformité (« conforme, vérifié, prouvé »). Il n'existe pas de
	 * rouge hors terminal, et la couleur n'est jamais le seul vecteur d'info —
	 * le libellé porte toujours le sens à lui seul.
	 */
	type Dot = 'ok' | 'accent' | null;

	const DOTS: Record<BadgeTone, Dot> = {
		neutral: null,
		accent: 'accent',
		ready: 'ok',
		beta: 'accent',
		planned: null,
		valid: 'ok',
		expired: 'accent',
		pending: 'accent',
		warn: 'accent',
		info: null,
		leaf: null,
		intermediate: null,
		root: 'ok'
	};

	/** Les tons « à venir » restent volontairement atténués (encre, pas couleur). */
	const MUTED: ReadonlySet<BadgeTone> = new Set<BadgeTone>(['planned']);
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	let { tone = 'neutral', children }: { tone?: BadgeTone; children: Snippet } = $props();

	const dot = $derived(DOTS[tone]);
	const muted = $derived(MUTED.has(tone));
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide ring-1 ring-slate-200 ring-inset dark:bg-slate-800 dark:ring-slate-800 {muted
		? 'text-slate-500 dark:text-slate-400'
		: 'text-slate-600 dark:text-slate-300'}"
>
	{#if dot}
		<span
			class="h-1.5 w-1.5 shrink-0 rounded-full {dot === 'ok'
				? 'bg-[color:var(--yk-ok)]'
				: 'bg-[color:var(--yk-accent)]'}"
			aria-hidden="true"
		></span>
	{/if}
	{@render children()}
</span>
