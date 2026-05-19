<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { decodeCertificate, type DecodedCertificate } from '$lib/pki/parse';
	import { ISRG_ROOT_X1 } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import CertCard from '$lib/components/CertCard.svelte';
	import Alert from '$lib/components/Alert.svelte';

	const tool = requireTool('decode-certificate');

	let input = $state('');
	let result = $state<DecodedCertificate | null>(null);
	let error = $state('');
	let loading = $state(false);

	async function decode() {
		loading = true;
		error = '';
		result = null;
		try {
			result = await decodeCertificate(input.trim());
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput bind:value={input} {loading} ondecode={decode} example={ISRG_ROOT_X1} />

<div class="mt-6 space-y-4" aria-live="polite" aria-atomic="false">
	{#if error}
		<Alert variant="error" title="Decoding failed">{error}</Alert>
	{/if}
	{#if result}
		<CertCard cert={result} />
	{/if}
</div>
