<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { createDecodeFlow } from '$lib/decodeFlow.svelte';
	import { parseAsn1, type Asn1Node } from '$lib/pki/asn1';
	import { ISRG_ROOT_X2 } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import DecodeError from '$lib/components/DecodeError.svelte';
	import CarryTo from '$lib/components/CarryTo.svelte';
	import StatusLine from '$lib/components/StatusLine.svelte';
	import Asn1Tree from '$lib/components/Asn1Tree.svelte';

	const tool = requireTool('asn1-viewer');

	/**
	 * Names the root node without repeating the byte size the recap already
	 * carries: the tag, and how many children hang off it when it has any.
	 */
	const shape = (n: Asn1Node) =>
		n.children.length
			? `${n.tag} · ${n.children.length === 1 ? '1 element' : `${n.children.length} elements`}`
			: n.tag;

	const flow = createDecodeFlow({
		run: (input) => parseAsn1(input),
		summary: shape,
		announce: () => 'ASN.1 structure parsed',
		failureLabel: 'Parsing failed'
	});
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
	rejectsPrivateKey
	ondecode={() => flow.decode()}
	decodeLabel="Parse"
	example={ISRG_ROOT_X2}
	placeholder="Paste a PEM or DER artefact (certificate, CSR, CRL…)…"
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
	{#if flow.result}
		<div
			class="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
		>
			<Asn1Tree node={flow.result} />
		</div>
	{/if}

	<!-- The answer first, then what else can be asked of the same artefact. -->
	{#if flow.result}
		<CarryTo artefact={flow.input} current={tool.slug} />
	{/if}
</div>
