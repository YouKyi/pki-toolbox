<script lang="ts">
	/**
	 * Shared input control for every decode tool: a PEM textarea that also
	 * accepts drag-and-dropped or browsed files. Binary DER files are wrapped
	 * into a PEM block (`derLabel`) so the textarea always shows armoured text.
	 */
	import { tick } from 'svelte';
	import Icon from './Icon.svelte';
	import Alert from './Alert.svelte';
	import NoNetworkProof from './NoNetworkProof.svelte';
	import RouteSuggestion from './RouteSuggestion.svelte';
	import { network } from '$lib/network.svelte';
	import { bytesToBase64, derToPem, MAX_INPUT_BYTES } from '$lib/pki/pem';
	import { detectBytes, detectPrivateKey, type Detected } from '$lib/pki/detect';

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
		 *
		 * This used to default to `false`, which meant a page that said nothing kept
		 * the old full-height editor, and that is exactly how the conversion page
		 * drifted for a week without anyone noticing. The default is the shared
		 * behaviour; a page that wants the editor to stay open has to say so.
		 */
		collapsed?: boolean;
		/** Opts a page out of folding entirely, for an input with no result of its own. */
		neverFolds?: boolean;
		/** What the recap names, e.g. the decoded subject. Falls back to a count. */
		summary?: string;
		/** True while the page holds a decoding error for this input. */
		invalid?: boolean;
		/** Id of the element explaining that error, tied to the field. */
		errorId?: string;
		/**
		 * Declares that this field is meant to hold a private key, as the signing
		 * page's CA key is. It changes what the veil says, never whether it
		 * appears: key material stays covered even where the key is wanted.
		 */
		acceptsPrivateKey?: boolean;
		/**
		 * Half-height field, for a box that is a doorway rather than a workbench:
		 * the home page only has to recognise what was pasted, not give the reader
		 * room to read it.
		 */
		compact?: boolean;
		/**
		 * Holds the action back when the caller knows there is nothing to do with
		 * what is in the box. The reason belongs to whatever already says it: the
		 * key veil, for instance, states its case before the button is reached.
		 */
		decodeDisabled?: boolean;
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
		neverFolds = false,
		summary,
		invalid = false,
		errorId,
		acceptsPrivateKey = false,
		compact = false,
		decodeDisabled = false,
		ondecode
	}: Props = $props();

	let dragOver = $state(false);
	let fileError = $state('');
	/** A dropped file that belongs to another tool, with what to hand it. */
	let mismatch = $state<{ detected: Detected; artefact: string } | null>(null);
	let fileInput: HTMLInputElement | undefined = $state();
	let textarea: HTMLTextAreaElement | undefined = $state();

	/** Local id so the file error can be tied to the field it describes. */
	const fileErrorId = $props.id();

	const blockCount = $derived((value.match(/-----BEGIN /g) ?? []).length);
	const byteSize = $derived(new TextEncoder().encode(value).length);
	const sizeLabel = $derived(
		byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} kB`
	);
	const recap = $derived(
		summary || (blockCount === 1 ? '1 PEM block' : `${blockCount} PEM blocks`)
	);

	/**
	 * The count the proof panel reports runs from the moment an artefact was
	 * handed over, because that is the question a reader actually has: not
	 * whether the page has ever loaded a font, but whether what they just
	 * pasted went anywhere.
	 */
	let hadContent = false;
	$effect(() => {
		const has = value.trim().length > 0;
		if (has && !hadContent) network.mark();
		hadContent = has;
	});

	/**
	 * A private key, wherever it lands and whatever it travels with. On a tool
	 * that never needed one the parsing layer would have failed on it
	 * generically, after the reader had already pressed the button; on the
	 * signing page it is exactly what the step asks for. Either way it is named
	 * the moment it arrives, and either way its content stays covered, including
	 * inside a bundle whose certificate is what the paste is really about.
	 */
	const pastedKey = $derived(detectPrivateKey(value));

	/** "a private key" opens the sentence, so it carries the capital. */
	const keyName = (detected: Detected) =>
		`${detected.label[0].toUpperCase()}${detected.label.slice(1)}`;

	/** Set once the reader asks to see the key. */
	let revealed = $state(false);

	/** The field is away while the veil is up, so it is focused once it returns. */
	async function reveal() {
		revealed = true;
		await tick();
		textarea?.focus();
	}
	const veiled = $derived(Boolean(pastedKey) && !revealed);
	/**
	 * A key is only a warning where no key was asked for. On the signing page the
	 * CA key is the whole point, so the box stays neutral and the veil is a
	 * discretion, not an alarm.
	 */
	const unwantedKey = $derived(Boolean(pastedKey) && !acceptsPrivateKey);

	// Emptying the box, or replacing the key with something else, restores the
	// veil for whatever lands next.
	$effect(() => {
		if (!pastedKey) revealed = false;
	});

	/**
	 * Reopening the editor puts the caret back where the reader left off. The
	 * focus waits for `tick()`: at microtask time the textarea does not exist
	 * yet, since Svelte has not applied the update that renders it.
	 */
	async function edit() {
		collapsed = false;
		await tick();
		textarea?.focus();
	}

	function clear() {
		value = '';
		fileError = '';
		mismatch = null;
		collapsed = false;
	}

	async function readFile(file: File) {
		fileError = '';
		mismatch = null;
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
			if (bytes[0] === 0x2d) {
				value = new TextDecoder().decode(bytes);
				return;
			}
			// A keystore armoured as a certificate is a lie the ASN.1 parser then
			// reports as the reader's mistake. When the bytes say what they are and
			// this tool does not read it, say so instead of wrapping it.
			const detected = detectBytes(bytes);
			if (detected?.kind === 'pkcs12' && derLabel !== 'PKCS12') {
				mismatch = { detected, artefact: bytesToBase64(bytes) };
				return;
			}
			value = derToPem(bytes, derLabel);
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
			if (!decodeDisabled) ondecode?.();
		}
	}
</script>

<div class="space-y-3">
	{#if collapsed && !neverFolds}
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
					data-yk-edit
					class="yk-pressable inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-surface-2 max-sm:min-h-11 dark:border-slate-700 dark:text-slate-200"
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
				? 'border-[color:var(--yk-accent)] bg-surface-2'
				: unwantedKey
					? 'border-[color:var(--yk-accent)]'
					: 'border-slate-300 dark:border-slate-700'}"
			ondragover={(e) => {
				e.preventDefault();
				dragOver = true;
			}}
			ondragleave={() => (dragOver = false)}
			ondrop={onDrop}
		>
			<!-- The claim belongs to the box that receives the artefact, not to a
			     line under the action row where it was read after the fact. -->
			<NoNetworkProof />
			<!-- The veil REPLACES the field rather than covering it. Laid over it, its
			     four lines overflowed a short box: the home page's doorway is half the
			     height of a tool's workbench, and the buttons fell through the bottom
			     border. The value lives in state, not in the DOM, so nothing is lost
			     while the field is away. -->
			{#if pastedKey && veiled}
				<!-- The product's own rule, applied to the box: private key material is
				     never displayed. Covering it is the message, and it is the one
				     treatment nobody can miss.

				     Reading the key back is a legitimate need, so the veil lifts on
				     demand and stays lifted. It never lifts by itself: the caret is
				     already in the field when a paste lands, and lifting on focus would
				     mean the veil is never seen by the one person it is for. Both its
				     controls sit in the tab order, so nobody is trapped. -->
				<!-- The live region is the sentence, not the panel. On the panel, a
				     screen reader recited the whole subtree on insertion, the two button
				     labels included, so the controls were read as prose before they
				     could be reached. They stay visible, clickable and in the tab order;
				     they simply stop being announced as text. -->
				<div
					class="flex flex-col items-center justify-center gap-1 rounded-xl px-6 py-8 text-center {compact
						? 'min-h-32'
						: 'min-h-64'}"
				>
					<Icon
						name="lock"
						size={24}
						class={unwantedKey ? 'text-[color:var(--yk-accent-txt)]' : 'text-ink-3'}
					/>
					<p role="status" class="mt-1 text-lg font-semibold text-ink">
						{keyName(pastedKey)} is in this box.
					</p>
					<p class="max-w-md text-sm text-ink-2">
						{acceptsPrivateKey
							? 'It is what this step needs. It is imported non-extractable, never leaves this page, and stays hidden here.'
							: 'It has not left this page, and nothing here needs it. Its content stays hidden.'}
					</p>
					<div class="mt-3 flex flex-wrap items-center justify-center gap-3">
						<button
							type="button"
							onclick={clear}
							class="yk-pressable inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-surface-2 max-sm:min-h-11 dark:border-slate-700 dark:text-slate-200"
						>
							<Icon name="close" size={15} /> Clear it
						</button>
						<button
							type="button"
							onclick={reveal}
							class="rounded text-sm font-medium text-slate-500 underline underline-offset-2 transition hover:text-teal-700 max-sm:min-h-11 dark:text-slate-400 dark:hover:text-teal-400"
						>
							Show it anyway
						</button>
					</div>
				</div>
			{:else}
				<textarea
					bind:this={textarea}
					bind:value
					{placeholder}
					aria-label="PKI artefact input"
					required
					aria-required="true"
					spellcheck="false"
					aria-invalid={invalid || Boolean(fileError) || undefined}
					aria-describedby={[fileError ? fileErrorId : '', invalid ? errorId : '']
						.filter(Boolean)
						.join(' ') || undefined}
					autocomplete="off"
					onkeydown={onKeydown}
					class="block w-full resize-y rounded-xl bg-transparent p-4 {compact
						? 'h-32'
						: 'h-64'} font-mono text-[13px] leading-relaxed text-slate-900 focus:ring-2 focus:ring-teal-500/40 focus:outline-none dark:text-slate-100"
				></textarea>
			{/if}
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
		<!-- `role="alert"` because this message replaces nothing on screen and is
		     the only feedback a dropped file gets: without it, an oversized file is
		     silent for a screen reader. -->
		<p id={fileErrorId} role="alert" class="text-sm text-red-600 dark:text-red-400">{fileError}</p>
	{/if}

	{#if mismatch}
		<Alert variant="warn" title="This file belongs to another tool">
			<RouteSuggestion detected={mismatch.detected} artefact={mismatch.artefact} />
		</Alert>
	{/if}

	<!-- Folded, the recap carries its own two controls; a second action row would
	     offer to decode what is already decoded. -->
	<div class="flex flex-wrap items-center gap-2" class:hidden={collapsed && !neverFolds}>
		{#if ondecode}
			<button
				type="button"
				onclick={() => ondecode?.()}
				disabled={loading || decodeDisabled || value.trim().length === 0}
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
			class="yk-pressable inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-surface-2 max-sm:min-h-11 dark:border-slate-700 dark:text-slate-200"
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
				class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-red-600 max-sm:min-h-11 dark:text-slate-400 dark:hover:text-red-400"
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
	{#if ondecode}
		<p class="hidden text-xs text-ink-3 sm:block">
			Tip: <kbd class="font-mono">/</kbd> to jump here, <kbd class="font-mono">Ctrl/⌘ + Enter</kbd> to
			decode.
		</p>
	{/if}
</div>
