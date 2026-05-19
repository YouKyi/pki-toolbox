<script module lang="ts">
	export type AlertVariant = 'error' | 'warn' | 'info' | 'success';

	const STYLES: Record<AlertVariant, { box: string; icon: string }> = {
		error: {
			box: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/30',
			icon: 'alert-triangle'
		},
		warn: {
			box: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30',
			icon: 'alert-triangle'
		},
		info: {
			box: 'bg-cyan-50 text-cyan-800 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-200 dark:ring-cyan-500/30',
			icon: 'info'
		},
		success: {
			box: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30',
			icon: 'check'
		}
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		variant = 'info',
		title,
		children
	}: { variant?: AlertVariant; title?: string; children?: Snippet } = $props();
</script>

<div class="flex gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset {STYLES[variant].box}">
	<Icon name={STYLES[variant].icon} size={18} class="mt-0.5 shrink-0" />
	<div class="min-w-0">
		{#if title}<p class="font-semibold">{title}</p>{/if}
		{#if children}<div class="break-words {title ? 'mt-0.5' : ''}">{@render children()}</div>{/if}
	</div>
</div>
