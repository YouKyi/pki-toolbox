<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { createDecodeFlow } from '$lib/decodeFlow.svelte';
	import { decodeChain, type DecodedChain } from '$lib/pki/chain';
	import { TEST_CHAIN } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import CertCard from '$lib/components/CertCard.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import StatusLine from '$lib/components/StatusLine.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import VerdictBand from '$lib/components/VerdictBand.svelte';

	const tool = requireTool('decode-chain');

	const length = (c: DecodedChain) =>
		c.links.length === 1 ? '1 certificate' : `${c.links.length} certificates`;

	/** The leaf is what the chain is actually about; it names the whole result. */
	const leafName = (c: DecodedChain) =>
		c.links[0]?.certificate.subjectParts.find((p) => p.key === 'CN')?.value ??
		c.links[0]?.certificate.subject ??
		'Certificate chain';

	const flow = createDecodeFlow({
		run: (input) => decodeChain(input),
		summary: (c) => `${leafName(c)} · chain of ${length(c)}`,
		announce: (c) =>
			`Chain decoded: ${length(c)}, ${c.complete ? 'every signature verified' : 'a link could not be verified'}`
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
	decodeLabel="Decode the chain"
	example={TEST_CHAIN}
	placeholder="Paste several concatenated PEM certificates here (leaf → … → root)…"
/>

<div bind:this={flow.region} id="result" tabindex="-1" class="mt-6 space-y-4 outline-none">
	<StatusLine message={flow.status} />
	{#if flow.error}
		<Alert id={flow.errorId} variant="error" title={flow.failureLabel}>{flow.error}</Alert>
	{/if}

	{#if flow.result}
		{@const chain = flow.result}
		<!-- One question owns this tool: does the chain hold. The band answers it,
		     and the alert below stays only when there is something to fix. -->
		<article
			class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			{#snippet chainBadges()}
				{#if chain.complete}<Badge tone="valid">Verified</Badge>
				{:else}<Badge tone="expired">Incomplete</Badge>{/if}
			{/snippet}
			<VerdictBand
				icon="link"
				title={leafName(chain)}
				lead="Chain of"
				value={length(chain)}
				note={chain.complete ? 'every signature verified' : 'a link could not be verified'}
				meta={chain.complete
					? 'Ends with a valid self-signed root'
					: 'Does not end with a valid self-signed root'}
				badges={chainBadges}
			/>
		</article>

		{#if !chain.complete}
			<Alert variant="warn" title="Incomplete or unordered chain">
				A signature could not be verified, or the chain does not end with a valid self-signed root.
				Check the order of the certificates (leaf first, root last).
			</Alert>
		{/if}

		<div class="space-y-0">
			{#each chain.links as link (link.index)}
				<CertCard cert={link.certificate} role={link.role} index={link.index} />

				{#if link.issuedByNext !== null}
					<div class="flex items-center gap-2 py-2 pl-5 text-sm">
						{#if link.issuedByNext}
							<span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
								<Icon name="check" size={16} />
								Signature verified: issued by certificate #{link.index + 2}
							</span>
						{:else}
							<span class="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
								<Icon name="close" size={16} />
								Signature not verified by certificate #{link.index + 2}
							</span>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
