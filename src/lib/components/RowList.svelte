<script module lang="ts">
	export type Row = {
		label: string;
		value: string;
		/** Render the value in a monospace font (hex, DNs, …). */
		mono?: boolean;
		/** Show a copy-to-clipboard button next to the value. */
		copy?: boolean;
	};
</script>

<script lang="ts">
	import Icon from './Icon.svelte';

	let { rows }: { rows: Row[] } = $props();

	let copied = $state<string | null>(null);

	async function copyValue(row: Row) {
		try {
			await navigator.clipboard.writeText(row.value);
			copied = row.label;
			setTimeout(() => {
				if (copied === row.label) copied = null;
			}, 1200);
		} catch {
			/* clipboard unavailable, nothing to do */
		}
	}
</script>

<dl class="divide-y divide-slate-200 dark:divide-slate-800">
	{#each rows as row (row.label)}
		<div class="grid gap-1 py-2.5 sm:grid-cols-[200px_1fr] sm:gap-4">
			<dt class="text-sm font-medium text-slate-500 dark:text-slate-400">{row.label}</dt>
			<dd class="flex items-start gap-2 text-sm text-slate-900 dark:text-slate-100">
				<span class="min-w-0 break-words {row.mono ? 'font-mono text-[13px]' : ''}"
					>{row.value}</span
				>
				{#if row.copy && row.value}
					<button
						type="button"
						onclick={() => copyValue(row)}
						class="shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-teal-600 dark:hover:bg-slate-800 dark:hover:text-teal-400"
						aria-label="Copier {row.label}"
						title="Copier"
					>
						<Icon name={copied === row.label ? 'check' : 'copy'} size={15} />
					</button>
				{/if}
			</dd>
		</div>
	{/each}
</dl>
