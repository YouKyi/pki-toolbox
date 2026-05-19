<script lang="ts">
	/**
	 * Shared input control for every decode tool: a PEM textarea that also
	 * accepts drag-and-dropped or browsed files. Binary DER files are wrapped
	 * into a PEM block (`derLabel`) so the textarea always shows armoured text.
	 */
	import Icon from './Icon.svelte';
	import { derToPem } from '$lib/pki/pem';

	type Props = {
		value: string;
		placeholder?: string;
		/** PEM label used when wrapping an uploaded binary DER file. */
		derLabel?: string;
		accept?: string;
		loading?: boolean;
		decodeLabel?: string;
		/** Optional sample to load via the "Example" button. */
		example?: string;
		ondecode?: () => void;
	};

	let {
		value = $bindable(''),
		placeholder = 'Paste a PEM block here (-----BEGIN …-----)…',
		derLabel = 'CERTIFICATE',
		accept = '.pem,.crt,.cer,.der,.txt,.csr,.req,.p7b',
		loading = false,
		decodeLabel = 'Decode',
		example,
		ondecode
	}: Props = $props();

	/** Reject oversized files before reading them into memory. */
	const MAX_FILE_BYTES = 8 * 1024 * 1024;

	let dragOver = $state(false);
	let fileError = $state('');
	let fileInput: HTMLInputElement | undefined = $state();

	async function readFile(file: File) {
		fileError = '';
		if (file.size > MAX_FILE_BYTES) {
			fileError = 'File too large (limit: 8 MB).';
			return;
		}
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			if (bytes.length === 0) {
				fileError = 'The file is empty.';
				return;
			}
			// 0x2D = '-' → already PEM text; otherwise treat as raw DER.
			value = bytes[0] === 0x2d ? new TextDecoder().decode(bytes) : derToPem(bytes, derLabel);
		} catch {
			fileError = 'Could not read this file.';
		}
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) readFile(file);
	}

	function onFilePick(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) readFile(file);
	}

	function onKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			event.preventDefault();
			ondecode?.();
		}
	}
</script>

<div class="space-y-3">
	<div
		role="group"
		aria-label="PEM input area"
		class="relative rounded-xl border-2 border-dashed transition-colors {dragOver
			? 'border-teal-500 bg-teal-50/60 dark:bg-teal-500/5'
			: 'border-slate-300 dark:border-slate-700'}"
		ondragover={(e) => {
			e.preventDefault();
			dragOver = true;
		}}
		ondragleave={() => (dragOver = false)}
		ondrop={onDrop}
	>
		<textarea
			bind:value
			{placeholder}
			spellcheck="false"
			autocomplete="off"
			onkeydown={onKeydown}
			class="block h-64 w-full resize-y rounded-xl bg-transparent p-4 font-mono text-[13px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/40 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600"
		></textarea>
		{#if dragOver}
			<div
				class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-teal-50/80 text-sm font-medium text-teal-700 dark:bg-slate-900/80 dark:text-teal-300"
			>
				<Icon name="upload" size={18} class="mr-2" /> Drop the file
			</div>
		{/if}
	</div>

	{#if fileError}
		<p class="text-sm text-red-600 dark:text-red-400">{fileError}</p>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		<button
			type="button"
			onclick={() => ondecode?.()}
			disabled={loading || value.trim().length === 0}
			class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 focus:ring-2 focus:ring-teal-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if loading}
				<Icon name="clock" size={16} /> Analyzing…
			{:else}
				<Icon name="shield" size={16} /> {decodeLabel}
			{/if}
		</button>

		<button
			type="button"
			onclick={() => fileInput?.click()}
			class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
		>
			<Icon name="upload" size={16} /> Import a file
		</button>

		{#if example}
			<button
				type="button"
				onclick={() => (value = example)}
				class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
			>
				<Icon name="file-text" size={16} /> Load an example
			</button>
		{/if}

		{#if value}
			<button
				type="button"
				onclick={() => {
					value = '';
					fileError = '';
				}}
				class="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
			>
				<Icon name="close" size={16} /> Clear
			</button>
		{/if}

		<input
			bind:this={fileInput}
			type="file"
			{accept}
			onchange={onFilePick}
			class="hidden"
			aria-hidden="true"
			tabindex="-1"
		/>
	</div>
	<p class="text-xs text-slate-400 dark:text-slate-500">
		Everything is decoded locally in your browser, no data is sent.
		<span class="hidden sm:inline">Tip: Ctrl/⌘ + Enter to decode.</span>
	</p>
</div>
