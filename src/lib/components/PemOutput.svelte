<script lang="ts">
	/**
	 * PEM result block with copy and download actions, shared by the
	 * generation tools.
	 */
	import Icon from './Icon.svelte';
	import { writeToClipboard } from '$lib/clipboard';
	import { downloadText } from '$lib/download';

	type Props = { title: string; value: string; filename: string };
	let { title, value, filename }: Props = $props();

	let copied = $state(false);

	async function copy() {
		if (await writeToClipboard(value)) {
			copied = true;
			setTimeout(() => (copied = false), 1200);
		}
	}
</script>

<article
	class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
>
	<header class="flex items-center justify-between px-5 py-3">
		<span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</span>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={copy}
				class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
			>
				<Icon name={copied ? 'check' : 'copy'} size={13} />
				{copied ? 'Copied' : 'Copy'}
			</button>
			<button
				type="button"
				onclick={() => downloadText(filename, value, 'application/x-pem-file')}
				class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
			>
				<Icon name="upload" size={13} class="rotate-180" /> Download
			</button>
		</div>
	</header>
	<pre
		class="max-h-56 overflow-auto border-t border-slate-200 bg-slate-50 p-4 font-mono text-[12px] leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">{value}</pre>
</article>
