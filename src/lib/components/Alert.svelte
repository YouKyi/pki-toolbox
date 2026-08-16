<script module lang="ts">
	export type AlertVariant = 'error' | 'warn' | 'info' | 'success';

	/**
	 * DA v2 · l'encadré est un plan NEUTRE ; le sens se lit à son FILET, à son
	 * icône et à son libellé. Pas de fond teinté, pas de rouge hors terminal :
	 * une erreur se signale par l'orange ET son texte.
	 *
	 * Le rail de 3px à gauche a été retiré : c'est la signature visuelle des
	 * sites générés, et elle ne dit rien que le filet ne dise mieux. Le bloc qui
	 * porte un état prend l'accent sur tout son pourtour, exactement comme la
	 * boîte de saisie qui contient une clé privée. Un seul vocabulaire : ce qui
	 * est en cause est cerné, jamais barré.
	 */
	const STYLES: Record<AlertVariant, { ring: string; icon: string; iconColor: string }> = {
		error: {
			ring: 'ring-[color:var(--yk-accent)]',
			icon: 'alert-triangle',
			iconColor: 'text-[color:var(--yk-accent-txt)]'
		},
		warn: {
			ring: 'ring-[color:var(--yk-accent)]',
			icon: 'alert-triangle',
			iconColor: 'text-[color:var(--yk-accent-txt)]'
		},
		info: {
			ring: 'ring-line',
			icon: 'info',
			iconColor: 'text-slate-500 dark:text-slate-400'
		},
		success: {
			ring: 'ring-[color:var(--yk-ok)]',
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
	class="relative flex gap-3 overflow-hidden rounded-xl bg-surface-2 px-4 py-3 text-sm text-slate-700 ring-1 ring-inset {STYLES[
		variant
	].ring} dark:text-slate-200"
>
	<Icon name={STYLES[variant].icon} size={18} class="mt-0.5 shrink-0 {STYLES[variant].iconColor}" />
	<div class="min-w-0">
		{#if title}<p class="font-semibold text-slate-900 dark:text-slate-100">{title}</p>{/if}
		{#if children}<div class="break-words {title ? 'mt-0.5' : ''}">{@render children()}</div>{/if}
	</div>
</div>
