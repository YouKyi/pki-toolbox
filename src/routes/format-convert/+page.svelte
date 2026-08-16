<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { createDecodeFlow } from '$lib/decodeFlow.svelte';
	import { convertArtefact, buildPkcs7, type ConvertedItem } from '$lib/pki/convert';
	import { hexWithColons } from '$lib/pki/format';
	import { downloadBytes } from '$lib/download';
	import { ISRG_ROOT_X2 } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import DecodeError from '$lib/components/DecodeError.svelte';
	import CarryTo from '$lib/components/CarryTo.svelte';
	import StatusLine from '$lib/components/StatusLine.svelte';
	import VerdictBand from '$lib/components/VerdictBand.svelte';
	import PemOutput from '$lib/components/PemOutput.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const tool = requireTool('format-convert');

	const certs = (items: ConvertedItem[]) => items.filter((i) => i.label.endsWith('CERTIFICATE'));

	/**
	 * One entry per artefact found in the input, each rendered in every format,
	 * so the recap counts artefacts, and names the single one when there is only
	 * one.
	 */
	const named = (items: ConvertedItem[]) =>
		items.length === 1 ? items[0].label : `${items.length} artefacts`;

	const flow = createDecodeFlow({
		run: (input) => convertArtefact(input),
		summary: named,
		announce: (items) => `Converted: ${named(items)}`,
		failureLabel: 'Conversion failed'
	});

	/**
	 * The band names the artefact the way a person would; the armour label stays
	 * where it belongs, inside the PEM block itself.
	 */
	const TITLES: Record<string, string> = {
		CERTIFICATE: 'Certificate',
		'TRUSTED CERTIFICATE': 'Certificate',
		'CERTIFICATE REQUEST': 'Signing request',
		'X509 CRL': 'Revocation list',
		PKCS7: 'PKCS#7 bundle'
	};
	const humanLabel = (label: string) => TITLES[label] ?? label;

	function slug(label: string) {
		return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
	}

	function downloadPkcs7(certItems: ConvertedItem[]) {
		downloadBytes(
			'bundle.p7b',
			buildPkcs7(certItems.map((i) => i.der)),
			'application/x-pkcs7-certificates'
		);
	}
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={flow.input}
	bind:collapsed={flow.collapsed}
	invalid={Boolean(flow.error)}
	errorId={flow.errorId}
	summary={flow.summary}
	loading={flow.loading}
	ondecode={() => flow.decode()}
	decodeLabel="Convert"
	example={ISRG_ROOT_X2}
	placeholder="Paste a PEM/DER certificate or a PKCS#7 bundle, or import a file…"
/>

<div bind:this={flow.region} id="result" tabindex="-1" class="mt-6 space-y-4 outline-none">
	<StatusLine message={flow.status} />
	{#if flow.error}
		<DecodeError
			id={flow.errorId}
			title={flow.failureLabel}
			message={flow.error}
			input={flow.input}
			current={tool.slug}
		/>
	{/if}

	{#if flow.result && flow.result.length}
		{@const items = flow.result}
		{@const certItems = certs(items)}
		{#if certItems.length}
			<div
				class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900"
			>
				<span class="text-sm text-slate-600 dark:text-slate-300">
					{certItems.length === 1 ? '1 certificate' : `${certItems.length} certificates`}, bundled
					into a single file:
				</span>
				<button
					type="button"
					onclick={() => downloadPkcs7(certItems)}
					class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-surface-2 dark:border-slate-700 dark:text-slate-200"
				>
					<Icon name="package" size={15} /> Download as PKCS#7 (.p7b)
				</button>
			</div>
		{/if}

		{#each items as item, i (i)}
			<article
				class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
			>
				<!-- The same answer layer as every decoder: the artefact names itself and
				     its measure is stated once, before the encodings that follow. The
				     armour label is not repeated as a badge, the PEM block spells it
				     out two lines below. -->
				<VerdictBand
					icon="convert"
					title={humanLabel(item.label)}
					lead="DER"
					value="{item.der.length} bytes"
					note="the same bytes in the three encodings below"
					meta="PEM · DER as base64 · DER as hexadecimal"
				/>
			</article>

			<!-- Du code : bloc terminal de la charte, sombre même en page claire, et
			     la même barre que sur les pages de génération. Un artefact converti
			     se lit et s'emporte de la même façon d'un outil à l'autre.

			     Le PEM est ouvert, les deux formes DER sont repliées sur leur barre :
			     c'est le PEM qu'on relit, le DER qu'on emporte. Copier et télécharger
			     restent accessibles sans rien déplier. -->
			<PemOutput title="PEM" value={item.pem} filename="{slug(item.label)}-{i + 1}.pem" />
			<PemOutput
				title="DER (base64)"
				value={item.derBase64}
				filename="{slug(item.label)}-{i + 1}.der"
				bytes={item.der}
				foldable
			/>
			<PemOutput
				title="DER (hexadecimal)"
				value={hexWithColons(item.derHex)}
				filename="{slug(item.label)}-{i + 1}.hex.txt"
				mime="text/plain"
				foldable
			/>
		{/each}
	{/if}

	<!-- The answer first, then what else can be asked of the same artefact. -->
	{#if flow.result}
		<CarryTo artefact={flow.input} current={tool.slug} />
	{/if}
</div>
