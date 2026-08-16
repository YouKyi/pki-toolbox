<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { createDecodeFlow } from '$lib/decodeFlow.svelte';
	import { decodePkcs7, type DecodedPkcs7 } from '$lib/pki/pkcs7';
	import { TEST_PKCS7 } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import CertCard from '$lib/components/CertCard.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import StatusLine from '$lib/components/StatusLine.svelte';
	import RowList from '$lib/components/RowList.svelte';
	import VerdictBand from '$lib/components/VerdictBand.svelte';

	const tool = requireTool('decode-pkcs7');

	/** A bundle is opened to find out what it carries. */
	const carried = (b: DecodedPkcs7) =>
		b.certificateCount === 1 ? '1 certificate' : `${b.certificateCount} certificates`;

	const flow = createDecodeFlow({
		run: (input) => decodePkcs7(input),
		summary: (b) => `PKCS#7 bundle · ${carried(b)}`,
		announce: (b) => `Bundle decoded: ${carried(b)}`
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
	ondecode={() => flow.decode()}
	decodeLabel="Decode the bundle"
	derLabel="PKCS7"
	example={TEST_PKCS7}
	placeholder="Paste a PKCS#7 bundle here (-----BEGIN PKCS7-----)…"
/>

<div bind:this={flow.region} id="result" tabindex="-1" class="mt-6 space-y-4 outline-none">
	<StatusLine message={flow.status} />
	{#if flow.error}
		<Alert id={flow.errorId} variant="error" title={flow.failureLabel}>{flow.error}</Alert>
	{/if}

	{#if flow.result}
		{@const bundle = flow.result}
		<article
			class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			<VerdictBand
				icon="package"
				title="PKCS#7 bundle"
				lead="Carries"
				value={carried(bundle)}
				meta={`${bundle.signerCount} signer${bundle.signerCount === 1 ? '' : 's'}${
					bundle.digestAlgorithms.length ? ` · ${bundle.digestAlgorithms.join(', ')}` : ''
				}`}
			/>
			<div class="px-5 py-4">
				<RowList
					rows={[
						{ label: 'Type', value: 'PKCS#7 SignedData' },
						{
							label: 'Certificates included',
							value: String(bundle.certificateCount)
						},
						{ label: 'Signers', value: String(bundle.signerCount) },
						{
							label: 'Hash algorithms',
							value: bundle.digestAlgorithms.length ? bundle.digestAlgorithms.join(', ') : '-'
						}
					]}
				/>
			</div>
		</article>

		{#if bundle.certificates.length}
			{#each bundle.certificates as cert, i (i)}
				<CertCard {cert} index={i} />
			{/each}
		{:else}
			<Alert variant="info">This PKCS#7 bundle contains no certificate.</Alert>
		{/if}
	{/if}
</div>
