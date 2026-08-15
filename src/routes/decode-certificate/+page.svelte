<script lang="ts">
	import { tick } from 'svelte';
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
	/** Folded on success: the answer takes the room the pasted PEM was holding. */
	let collapsed = $state(false);
	let resultRegion: HTMLDivElement | undefined = $state();

	const summary = $derived(
		result
			? `${result.subjectParts.find((p) => p.key === 'CN')?.value ?? result.subject} · certificate`
			: ''
	);

	async function decode() {
		loading = true;
		error = '';
		result = null;
		try {
			result = await decodeCertificate(input.trim());
			collapsed = true;
			// The answer is useless if the reader is still parked on their own
			// base64: hand the keyboard and the viewport to the result.
			await tick();
			resultRegion?.focus();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			collapsed = false;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	bind:collapsed
	{summary}
	{loading}
	ondecode={decode}
	example={ISRG_ROOT_X1}
/>

<div
	bind:this={resultRegion}
	tabindex="-1"
	class="mt-6 space-y-4 outline-none"
	aria-live="polite"
	aria-atomic="false"
>
	{#if error}
		<Alert variant="error" title="Decoding failed">{error}</Alert>
	{/if}
	{#if result}
		<CertCard cert={result} />
	{/if}
</div>
