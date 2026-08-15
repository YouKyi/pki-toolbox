<script lang="ts">
	import { tick } from 'svelte';
	import { revealResult } from '$lib/reveal';
	import { requireTool } from '$lib/tools';
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

	let input = $state('');
	let result = $state<DecodedPkcs7 | null>(null);
	let error = $state('');
	let loading = $state(false);
	let collapsed = $state(false);
	let resultRegion: HTMLDivElement | undefined = $state();
	/** Ties the failure message to the field that caused it. */
	const errorId = $props.id();

	async function decode() {
		loading = true;
		error = '';
		result = null;
		try {
			result = await decodePkcs7(input.trim());
			collapsed = true;
			await tick();
			revealResult(resultRegion);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			collapsed = false;
		} finally {
			loading = false;
		}
	}

	/** A bundle is opened to find out what it carries. */
	const carried = $derived(
		result
			? result.certificateCount === 1
				? '1 certificate'
				: `${result.certificateCount} certificates`
			: ''
	);

	/** One sentence for assistive technology; the card carries the detail. */
	const status = $derived(
		error ? `Decoding failed: ${error}` : result ? `Bundle decoded: ${carried}` : ''
	);
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	invalid={Boolean(error)}
	{errorId}
	bind:collapsed
	summary={result ? `PKCS#7 bundle · ${carried}` : ''}
	{loading}
	ondecode={decode}
	decodeLabel="Decode the bundle"
	derLabel="PKCS7"
	example={TEST_PKCS7}
	placeholder="Paste a PKCS#7 bundle here (-----BEGIN PKCS7-----)…"
/>

<div bind:this={resultRegion} id="result" tabindex="-1" class="mt-6 space-y-4 outline-none">
	<StatusLine message={status} />
	{#if error}
		<Alert id={errorId} variant="error" title="Decoding failed">{error}</Alert>
	{/if}

	{#if result}
		<article
			class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			<VerdictBand
				icon="package"
				title="PKCS#7 bundle"
				lead="Carries"
				value={carried}
				meta={`${result.signerCount} signer${result.signerCount === 1 ? '' : 's'}${
					result.digestAlgorithms.length ? ` · ${result.digestAlgorithms.join(', ')}` : ''
				}`}
			/>
			<div class="px-5 py-4">
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
							value: result.digestAlgorithms.length ? result.digestAlgorithms.join(', ') : '-'
						}
					]}
				/>
			</div>
		</article>

		{#if result.certificates.length}
			{#each result.certificates as cert, i (i)}
				<CertCard {cert} index={i} />
			{/each}
		{:else}
			<Alert variant="info">This PKCS#7 bundle contains no certificate.</Alert>
		{/if}
	{/if}
</div>
