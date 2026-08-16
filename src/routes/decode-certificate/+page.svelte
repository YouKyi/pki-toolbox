<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { createDecodeFlow } from '$lib/decodeFlow.svelte';
	import { decodeCertificate, type DecodedCertificate } from '$lib/pki/parse';
	import { ISRG_ROOT_X1 } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import CertCard from '$lib/components/CertCard.svelte';
	import DecodeError from '$lib/components/DecodeError.svelte';
	import StatusLine from '$lib/components/StatusLine.svelte';

	const tool = requireTool('decode-certificate');

	const cn = (c: DecodedCertificate) =>
		c.subjectParts.find((p) => p.key === 'CN')?.value ?? c.subject;

	const flow = createDecodeFlow({
		run: (input) => decodeCertificate(input),
		summary: (c) => `${cn(c)} · certificate`,
		announce: (c) => `Certificate decoded: ${cn(c)}`
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
	example={ISRG_ROOT_X1}
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
		<CertCard cert={flow.result} />
	{/if}
</div>
