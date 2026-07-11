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

	const TONES: Record<BadgeTone, string> = {
		neutral:
			'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
		accent:
			'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30',
		ready:
			'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30',
		beta: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
		planned:
			'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
		valid:
			'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
		expired:
			'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
		pending:
			'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
		warn: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
		info: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/30',
		leaf: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
		intermediate:
			'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
		root: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	let { tone = 'neutral', children }: { tone?: BadgeTone; children: Snippet } = $props();
</script>

<span
	class="yk-cut-sm inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide ring-1 ring-inset {TONES[
		tone
	]}"
>
	{@render children()}
</span>
