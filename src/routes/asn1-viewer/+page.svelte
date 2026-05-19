<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { parseAsn1, type Asn1Node } from '$lib/pki/asn1';
	import { ISRG_ROOT_X2 } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Asn1Tree from '$lib/components/Asn1Tree.svelte';

	const tool = requireTool('asn1-viewer');

	let input = $state('');
	let result = $state<Asn1Node | null>(null);
	let error = $state('');

	function decode() {
		error = '';
		result = null;
		try {
			result = parseAsn1(input.trim());
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	ondecode={decode}
	decodeLabel="Parse"
	example={ISRG_ROOT_X2}
	placeholder="Paste a PEM or DER artefact (certificate, CSR, key, CRL…)…"
/>

<div class="mt-6 space-y-4" aria-live="polite" aria-atomic="false">
	{#if error}
		<Alert variant="error" title="Parsing failed">{error}</Alert>
	{/if}
	{#if result}
		<div
			class="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
		>
			<Asn1Tree node={result} />
		</div>
	{/if}
</div>
