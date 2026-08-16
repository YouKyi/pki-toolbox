<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { createDecodeFlow } from '$lib/decodeFlow.svelte';
	import { decodeCsr, type DecodedCsr } from '$lib/pki/parse';
	import { TEST_CSR } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import StatusLine from '$lib/components/StatusLine.svelte';
	import RowList from '$lib/components/RowList.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import VerdictBand from '$lib/components/VerdictBand.svelte';

	const tool = requireTool('decode-csr');

	const cn = (c: DecodedCsr) => c.subjectParts.find((p) => p.key === 'CN')?.value ?? c.subject;

	/** What the request asks for: the names it covers, and whether it wants a CA. */
	const requested = (c: DecodedCsr) =>
		[
			c.subjectAltNames.length === 1
				? '1 alternative name'
				: c.subjectAltNames.length > 1
					? `${c.subjectAltNames.length} alternative names`
					: '',
			c.basicConstraints?.ca ? 'requests a CA certificate' : ''
		]
			.filter(Boolean)
			.join(' · ');

	const flow = createDecodeFlow({
		run: (input) => decodeCsr(input),
		summary: (c) => `${cn(c)} · signing request`,
		announce: (c) => `Signing request decoded: ${cn(c)}`
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
	derLabel="CERTIFICATE REQUEST"
	example={TEST_CSR}
	placeholder="Paste a PKCS#10 request here (-----BEGIN CERTIFICATE REQUEST-----)…"
/>

<div bind:this={flow.region} id="result" tabindex="-1" class="mt-6 space-y-4 outline-none">
	<StatusLine message={flow.status} />
	{#if flow.error}
		<Alert id={flow.errorId} variant="error" title={flow.failureLabel}>{flow.error}</Alert>
	{/if}

	{#if flow.result}
		{@const csr = flow.result}
		<article
			class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			{#snippet csrBadges()}
				<Badge tone="neutral">CSR</Badge>
			{/snippet}
			<!-- A signing request is read for what it asks for: which key, signed how,
			     and which names it would cover. -->
			<VerdictBand
				icon="file-text"
				title={cn(csr)}
				lead="Key"
				value={csr.publicKey.label}
				note={`signed with ${csr.signatureAlgorithm}`}
				meta={requested(csr) || 'PKCS#10 signing request'}
				badges={csrBadges}
			/>

			<section class="px-5 py-4">
				<h3 class="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">Identity</h3>
				<RowList rows={[{ label: 'Subject', value: csr.subject || '-', mono: true }]} />
			</section>

			<section class="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
				<h3 class="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">
					Key & signature
				</h3>
				<RowList
					rows={[
						{ label: 'Public key', value: csr.publicKey.label },
						{ label: 'Signature algorithm', value: csr.signatureAlgorithm }
					]}
				/>
			</section>

			{#if csr.subjectAltNames.length || csr.extendedKeyUsage.length || csr.basicConstraints}
				<section class="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
					<h3 class="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">
						Requested extensions
					</h3>
					<div class="space-y-3">
						{#if csr.subjectAltNames.length}
							<div>
								<p class="mb-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
									Subject Alternative Names
								</p>
								<div class="flex flex-wrap gap-1.5">
									{#each csr.subjectAltNames as san (san.type + san.value)}
										<Badge tone="neutral">{san.type}: {san.value}</Badge>
									{/each}
								</div>
							</div>
						{/if}
						{#if csr.extendedKeyUsage.length}
							<div>
								<p class="mb-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
									Extended Key Usage
								</p>
								<div class="flex flex-wrap gap-1.5">
									{#each csr.extendedKeyUsage as eku (eku)}
										<Badge tone="info">{eku}</Badge>
									{/each}
								</div>
							</div>
						{/if}
						{#if csr.basicConstraints}
							<RowList
								rows={[
									{
										label: 'Basic Constraints',
										value: csr.basicConstraints.ca
											? `CA${csr.basicConstraints.pathLength !== undefined ? `, path length ${csr.basicConstraints.pathLength}` : ''}`
											: 'Non-CA'
									}
								]}
							/>
						{/if}
					</div>
				</section>
			{/if}
		</article>
	{/if}
</div>
