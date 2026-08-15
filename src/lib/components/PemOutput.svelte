<script lang="ts">
	/**
	 * PEM result block with copy and download actions, shared by the
	 * generation tools.
	 *
	 * DA v2 · c'est du code : il est rendu en BLOC TERMINAL, la signature
	 * technique de la charte. Palette verrouillée, toujours sombre même sur
	 * page claire (façon capture) — spec brand/terminal-block.md.
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

<article class="ykterm">
	<header class="ykterm__bar">
		<span class="ykterm__dot"></span>
		<span class="ykterm__dot"></span>
		<span class="ykterm__dot live"></span>
		<span class="ykterm__title">{title}</span>
		<div class="ml-auto flex shrink-0 gap-2">
			<button
				type="button"
				onclick={copy}
				class="yk-pressable inline-flex items-center gap-1.5 rounded-md border border-[#3a342e] px-2.5 py-1 font-mono text-xs font-medium text-[#f2f0ec] transition hover:bg-[#2a2622] max-sm:min-h-11"
			>
				<Icon name={copied ? 'check' : 'copy'} size={13} />
				{copied ? 'Copied' : 'Copy'}
			</button>
			<button
				type="button"
				onclick={() => downloadText(filename, value, 'application/x-pem-file')}
				class="yk-pressable inline-flex items-center gap-1.5 rounded-md border border-[#3a342e] px-2.5 py-1 font-mono text-xs font-medium text-[#f2f0ec] transition hover:bg-[#2a2622] max-sm:min-h-11"
			>
				<Icon name="upload" size={13} class="rotate-180" /> Download
			</button>
		</div>
	</header>
	<pre class="ykterm__body max-h-56">{value}</pre>
</article>
