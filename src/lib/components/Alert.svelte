<script module lang="ts">
	export type AlertVariant = 'error' | 'warn' | 'info' | 'success';

	/**
	 * DA v2 · l'encadré est un plan NEUTRE ; le sens se lit à son filet de
	 * marge, à son icône et à son libellé. Pas de fond teinté, pas de rouge
	 * hors terminal : une erreur se signale par l'orange ET son texte.
	 */
	const STYLES: Record<AlertVariant, { marker: string; icon: string; iconColor: string }> = {
		error: {
			marker: 'bg-[color:var(--yk-accent)]',
			icon: 'alert-triangle',
			iconColor: 'text-[color:var(--yk-accent-txt)]'
		},
		warn: {
			marker: 'bg-[color:var(--yk-accent)]',
			icon: 'alert-triangle',
			iconColor: 'text-[color:var(--yk-accent-txt)]'
		},
		info: {
			marker: 'bg-slate-300 dark:bg-slate-700',
			icon: 'info',
			iconColor: 'text-slate-500 dark:text-slate-400'
		},
		success: {
			marker: 'bg-[color:var(--yk-ok)]',
			icon: 'check',
			iconColor: 'text-[color:var(--yk-ok)]'
		}
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		variant = 'info',
		title,
		id,
		children
	}: { variant?: AlertVariant; title?: string; id?: string; children?: Snippet } = $props();
</script>

<div
	{id}
	class="relative flex gap-3 overflow-hidden rounded-xl bg-surface-2 px-4 py-3 pl-5 text-sm text-slate-700 ring-1 ring-line ring-inset dark:text-slate-200"
>
	<span class="absolute top-0 bottom-0 left-0 w-[3px] {STYLES[variant].marker}" aria-hidden="true"
	></span>
	<Icon name={STYLES[variant].icon} size={18} class="mt-0.5 shrink-0 {STYLES[variant].iconColor}" />
	<div class="min-w-0">
		{#if title}<p class="font-semibold text-slate-900 dark:text-slate-100">{title}</p>{/if}
		{#if children}<div class="break-words {title ? 'mt-0.5' : ''}">{@render children()}</div>{/if}
	</div>
</div>
