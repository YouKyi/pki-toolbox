<script lang="ts">
	/**
	 * PEM result block with copy and download actions, shared by the
	 * generation tools.
	 *
	 * DA v2 · c'est du code : il est rendu en BLOC TERMINAL, la signature
	 * technique de la charte. Palette verrouillée, toujours sombre même sur
	 * page claire (façon capture), spec brand/terminal-block.md.
	 */
	import Icon from './Icon.svelte';
	import { writeToClipboard } from '$lib/clipboard';
	import { downloadBytes, downloadText } from '$lib/download';

	type Props = {
		title: string;
		value: string;
		filename: string;
		/**
		 * Raw bytes to download instead of the displayed text. A DER file is read
		 * on screen as base64 or hex, but what a reader wants on disk is the
		 * binary, not the transcription of it.
		 */
		bytes?: Uint8Array;
		mime?: string;
		/**
		 * Starts closed, showing its bar alone. A block whose content the reader
		 * rarely needs to read still needs to be there to be copied, and a closed
		 * terminal window is a bar with nothing under it: no new vocabulary, and
		 * copy and download stay reachable without opening anything.
		 */
		foldable?: boolean;
	};
	let { title, value, filename, bytes, mime, foldable = false }: Props = $props();

	/** Only meaningful while `foldable`: a block that never folds is always open. */
	let open = $state(false);
	const shown = $derived(!foldable || open);
	const bodyId = $props.id();

	function download() {
		if (bytes) downloadBytes(filename, bytes, mime);
		else downloadText(filename, value, mime ?? 'application/x-pem-file');
	}

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
			{#if foldable}
				<button
					type="button"
					onclick={() => (open = !open)}
					aria-expanded={shown}
					aria-controls={bodyId}
					class="yk-pressable inline-flex items-center gap-1.5 rounded-md border border-[#3a342e] px-2.5 py-1 font-mono text-xs font-medium text-[#f2f0ec] transition hover:bg-[#2a2622] max-sm:min-h-11"
				>
					<Icon
						name="chevron-down"
						size={13}
						class={shown ? 'rotate-180 transition' : 'transition'}
					/>
					{shown ? 'Hide' : 'Show'}
				</button>
			{/if}
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
				onclick={download}
				class="yk-pressable inline-flex items-center gap-1.5 rounded-md border border-[#3a342e] px-2.5 py-1 font-mono text-xs font-medium text-[#f2f0ec] transition hover:bg-[#2a2622] max-sm:min-h-11"
			>
				<Icon name="upload" size={13} class="rotate-180" /> Download
			</button>
		</div>
	</header>
	{#if shown}
		<pre id={bodyId} class="ykterm__body max-h-56">{value}</pre>
	{/if}
</article>
