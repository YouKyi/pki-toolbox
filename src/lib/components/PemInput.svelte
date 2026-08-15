<script lang="ts">
	/**
	 * Shared input control for every decode tool: a PEM textarea that also
	 * accepts drag-and-dropped or browsed files. Binary DER files are wrapped
	 * into a PEM block (`derLabel`) so the textarea always shows armoured text.
	 */
	import Icon from './Icon.svelte';
	import { derToPem, MAX_INPUT_BYTES } from '$lib/pki/pem';

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
		/**
		 * Folds the editor into a one-line recap. A decoded artefact is worth more
		 * screen than the base64 the user just pasted, so the caller sets this on a
		 * successful decode and the answer takes the viewport back.
		 */
		collapsed?: boolean;
		/** What the recap names, e.g. the decoded subject. Falls back to a count. */
		summary?: string;
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
		collapsed = $bindable(false),
		summary,
		ondecode
	}: Props = $props();

	let dragOver = $state(false);
	let fileError = $state('');
	let fileInput: HTMLInputElement | undefined = $state();
	let textarea: HTMLTextAreaElement | undefined = $state();

	const blockCount = $derived((value.match(/-----BEGIN /g) ?? []).length);
	const byteSize = $derived(new TextEncoder().encode(value).length);
	const sizeLabel = $derived(
		byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} kB`
	);
	const recap = $derived(
		summary || (blockCount === 1 ? '1 PEM block' : `${blockCount} PEM blocks`)
	);

	/** Reopening the editor puts the caret back where the user left off. */
	function edit() {
		collapsed = false;
		queueMicrotask(() => textarea?.focus());
	}

	function clear() {
		value = '';
		fileError = '';
		collapsed = false;
	}

	async function readFile(file: File) {
		fileError = '';
		if (file.size > MAX_INPUT_BYTES) {
			fileError = `File too large (limit: ${MAX_INPUT_BYTES / (1024 * 1024)} MB).`;
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
	{#if collapsed}
		<!-- The decoded artefact owns the viewport now; the source stays one click
		     away. Recap on the raised plane so it reads as a folded editor, not as
		     a result. -->
		<div
			class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-surface-2 px-4 py-3 dark:border-slate-800"
		>
			<Icon name="file-text" size={16} class="shrink-0 text-ink-3" />
			<p class="min-w-[8rem] flex-1 truncate text-sm text-ink" title={recap}>
				{recap}<span class="text-ink-3"> · {sizeLabel}</span>
			</p>
			<div class="flex shrink-0 items-center gap-2">
				<button
					type="button"
					onclick={edit}
					class="yk-pressable inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 max-sm:min-h-11 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
				>
					<Icon name="file-text" size={13} /> Edit input
				</button>
				<button
					type="button"
					onclick={clear}
					class="yk-pressable inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:text-teal-700 max-sm:min-h-11 dark:text-slate-400 dark:hover:text-teal-400"
				>
					<Icon name="close" size={13} /> Clear
				</button>
			</div>
		</div>
	{:else}
		<div
			role="group"
			aria-label="PEM input area"
			class="relative rounded-xl border-2 border-dashed transition-colors {dragOver
				? 'border-[color:var(--yk-accent)] bg-slate-100 dark:bg-slate-800'
				: 'border-slate-300 dark:border-slate-700'}"
			ondragover={(e) => {
				e.preventDefault();
				dragOver = true;
			}}
			ondragleave={() => (dragOver = false)}
			ondrop={onDrop}
		>
			<textarea
				bind:this={textarea}
				bind:value
				{placeholder}
				aria-label="PKI artefact input"
				required
				aria-required="true"
				spellcheck="false"
				autocomplete="off"
				onkeydown={onKeydown}
				class="block h-64 w-full resize-y rounded-xl bg-transparent p-4 font-mono text-[13px] leading-relaxed text-slate-900 focus:ring-2 focus:ring-teal-500/40 focus:outline-none dark:text-slate-100"
			></textarea>
			{#if dragOver}
				<div
					class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-slate-100/90 text-sm font-medium text-teal-700 dark:bg-slate-900/85 dark:text-teal-300"
				>
					<Icon name="upload" size={18} class="mr-2" /> Drop the file
				</div>
			{/if}
		</div>
	{/if}

	{#if fileError}
		<p class="text-sm text-red-600 dark:text-red-400">{fileError}</p>
	{/if}

	<!-- Folded, the recap carries its own two controls; a second action row would
	     offer to decode what is already decoded. -->
	<div class="flex flex-wrap items-center gap-2" class:hidden={collapsed}>
		{#if ondecode}
			<button
				type="button"
				onclick={() => ondecode?.()}
				disabled={loading || value.trim().length === 0}
				class="yk-pressable inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-11 dark:bg-teal-400 dark:text-[color:var(--yk-on-accent)] dark:hover:bg-teal-300"
			>
				{#if loading}
					<Icon name="clock" size={16} /> Analyzing…
				{:else}
					<Icon name="shield" size={16} /> {decodeLabel}
				{/if}
			</button>
		{/if}

		<button
			type="button"
			onclick={() => fileInput?.click()}
			class="yk-pressable inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 max-sm:min-h-11 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
		>
			<Icon name="upload" size={16} /> Import a file
		</button>

		{#if example}
			<button
				type="button"
				onclick={() => (value = example)}
				class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-teal-700 max-sm:min-h-11 dark:text-slate-400 dark:hover:text-teal-400"
			>
				<Icon name="file-text" size={16} /> Load an example
			</button>
		{/if}

		{#if value}
			<button
				type="button"
				onclick={clear}
				class="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-red-600 max-sm:min-h-11 dark:text-slate-400 dark:hover:text-red-400"
			>
				<Icon name="close" size={16} /> Clear
			</button>
		{/if}

		<input
			bind:this={fileInput}
			type="file"
			{accept}
			onchange={onFilePick}
			aria-label="Import a PKI file"
			class="hidden"
			tabindex="-1"
		/>
	</div>
	<p class="text-xs text-ink-3">
		Everything is decoded locally in your browser, no data is sent.
		{#if ondecode}
			<span class="hidden sm:inline">Tip: Ctrl/⌘ + Enter to decode.</span>
		{/if}
	</p>
</div>
