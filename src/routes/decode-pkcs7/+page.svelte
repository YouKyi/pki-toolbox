<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { decodePkcs7, type DecodedPkcs7 } from '$lib/pki/pkcs7';
	import { TEST_PKCS7 } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import CertCard from '$lib/components/CertCard.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import RowList from '$lib/components/RowList.svelte';

	const tool = requireTool('decode-pkcs7');

	let input = $state('');
	let result = $state<DecodedPkcs7 | null>(null);
	let error = $state('');
	let loading = $state(false);

	async function decode() {
		loading = true;
		error = '';
		result = null;
		try {
			result = await decodePkcs7(input.trim());
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>{tool.name}, pki-toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	{loading}
	ondecode={decode}
	decodeLabel="Decode the bundle"
	derLabel="PKCS7"
	example={TEST_PKCS7}
	placeholder="Paste a PKCS#7 bundle here (-----BEGIN PKCS7-----)…"
/>

<div class="mt-6 space-y-4">
	{#if error}
		<Alert variant="error" title="Decoding failed">{error}</Alert>
	{/if}

	{#if result}
		<div
			class="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			<RowList
				rows={[
					{ label: 'Type', value: 'PKCS#7 SignedData' },
					{
						label: 'Certificates included',
						value: String(result.certificateCount)
					},
					{ label: 'Signers', value: String(result.signerCount) },
					{
						label: 'Hash algorithms',
						value: result.digestAlgorithms.length ? result.digestAlgorithms.join(', ') : ', '
					}
				]}
			/>
		</div>

		{#if result.certificates.length}
			{#each result.certificates as cert, i (i)}
				<CertCard {cert} index={i} />
			{/each}
		{:else}
			<Alert variant="info">This PKCS#7 bundle contains no certificate.</Alert>
		{/if}
	{/if}
</div>
