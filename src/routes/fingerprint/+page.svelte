<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { createDecodeFlow } from '$lib/decodeFlow.svelte';
	import { decodeCertificate, type DecodedCertificate } from '$lib/pki/parse';
	import { hexWithColons } from '$lib/pki/format';
	import { ISRG_ROOT_X1 } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import DecodeError from '$lib/components/DecodeError.svelte';
	import StatusLine from '$lib/components/StatusLine.svelte';
	import RowList from '$lib/components/RowList.svelte';
	import VerdictBand from '$lib/components/VerdictBand.svelte';

	const tool = requireTool('fingerprint');

	const cn = (c: DecodedCertificate) =>
		c.subjectParts.find((p) => p.key === 'CN')?.value ?? c.subject;

	const fingerprintRows = (c: DecodedCertificate) => [
		{ label: 'SHA-1', value: hexWithColons(c.fingerprints.sha1), mono: true, copy: true },
		{ label: 'SHA-256', value: hexWithColons(c.fingerprints.sha256), mono: true, copy: true },
		{ label: 'SHA-512', value: hexWithColons(c.fingerprints.sha512), mono: true, copy: true }
	];

	const flow = createDecodeFlow({
		run: (input) => decodeCertificate(input),
		summary: (c) => `${cn(c)} · certificate`,
		announce: (c) => `Fingerprints computed for ${cn(c)}`
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
	decodeLabel="Compute fingerprints"
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
		{@const cert = flow.result}
		<article
			class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			<!-- The digests themselves are the answer, and they are one row below;
			     the band names what was hashed and over how much. -->
			<VerdictBand
				icon="fingerprint"
				title={cn(cert)}
				lead="Computed over"
				value={`${cert.der.length} bytes`}
				note="the certificate's complete DER"
				meta={cert.subject}
			/>
			<div class="px-5 py-4">
				<RowList rows={fingerprintRows(cert)} />
			</div>
		</article>
		<Alert variant="info">
			Fingerprints are digests of the certificate's complete DER, the same value shown by a browser
			or by <code class="font-mono text-xs">openssl x509 -fingerprint</code>.
		</Alert>
	{/if}
</div>
