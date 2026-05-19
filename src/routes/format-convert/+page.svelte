<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { convertArtefact, buildPkcs7, type ConvertedItem } from '$lib/pki/convert';
	import { hexWithColons } from '$lib/pki/format';
	import { downloadBytes, downloadText } from '$lib/download';
	import { ISRG_ROOT_X2 } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const tool = requireTool('format-convert');

	let input = $state('');
	let items = $state<ConvertedItem[]>([]);
	let error = $state('');
	let copied = $state('');

	const certItems = $derived(items.filter((i) => i.label.endsWith('CERTIFICATE')));

	function decode() {
		error = '';
		items = [];
		try {
			items = convertArtefact(input.trim());
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	async function copy(text: string, id: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = id;
			setTimeout(() => {
				if (copied === id) copied = '';
			}, 1200);
		} catch {
			/* clipboard unavailable */
		}
	}

	function slug(label: string) {
		return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
	}

	function downloadPkcs7() {
		downloadBytes(
			'bundle.p7b',
			buildPkcs7(certItems.map((i) => i.der)),
			'application/x-pkcs7-certificates'
		);
	}
</script>

<svelte:head><title>{tool.name}, pki-toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	ondecode={decode}
	decodeLabel="Convertir"
	example={ISRG_ROOT_X2}
	placeholder="Collez un certificat PEM/DER ou un bundle PKCS#7, ou importez un fichier…"
/>

<div class="mt-6 space-y-4">
	{#if error}
		<Alert variant="error" title="Échec de la conversion">{error}</Alert>
	{/if}

	{#if items.length}
		{#if certItems.length}
			<div
				class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900"
			>
				<span class="text-sm text-slate-600 dark:text-slate-300">
					{certItems.length} certificat(s), regrouper en un seul fichier :
				</span>
				<button
					type="button"
					onclick={downloadPkcs7}
					class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
				>
					<Icon name="package" size={15} /> Télécharger en PKCS#7 (.p7b)
				</button>
			</div>
		{/if}

		{#each items as item, i (i)}
			{@const id = `item-${i}`}
			<article
				class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
			>
				<header class="flex flex-wrap items-center gap-2 px-5 py-3">
					<Badge tone="accent">{item.label}</Badge>
					<span class="text-xs text-slate-400 dark:text-slate-500">{item.der.length} octets</span>
					<div class="ml-auto flex gap-2">
						<button
							type="button"
							onclick={() =>
								downloadText(
									`${slug(item.label)}-${i + 1}.pem`,
									item.pem,
									'application/x-pem-file'
								)}
							class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
						>
							<Icon name="upload" size={13} class="rotate-180" /> .pem
						</button>
						<button
							type="button"
							onclick={() => downloadBytes(`${slug(item.label)}-${i + 1}.der`, item.der)}
							class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
						>
							<Icon name="upload" size={13} class="rotate-180" /> .der
						</button>
					</div>
				</header>

				{#snippet block(title: string, value: string, blockId: string)}
					<div class="border-t border-slate-200 px-5 py-3 dark:border-slate-800">
						<div class="mb-1.5 flex items-center justify-between">
							<span
								class="text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500"
							>
								{title}
							</span>
							<button
								type="button"
								onclick={() => copy(value, blockId)}
								class="inline-flex items-center gap-1 rounded p-1 text-slate-400 transition hover:text-teal-600 dark:hover:text-teal-400"
							>
								<Icon name={copied === blockId ? 'check' : 'copy'} size={14} />
							</button>
						</div>
						<pre
							class="max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-[12px] leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">{value}</pre>
					</div>
				{/snippet}

				{@render block('PEM', item.pem, `${id}-pem`)}
				{@render block('DER (base64)', item.derBase64, `${id}-b64`)}
				{@render block('DER (hexadécimal)', hexWithColons(item.derHex), `${id}-hex`)}
			</article>
		{/each}
	{/if}
</div>
