<script lang="ts">
	import { tick } from 'svelte';
	import { requireTool } from '$lib/tools';
	import { decodeCsr, type DecodedCsr } from '$lib/pki/parse';
	import { TEST_CSR } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import RowList from '$lib/components/RowList.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import VerdictBand from '$lib/components/VerdictBand.svelte';

	const tool = requireTool('decode-csr');

	let input = $state('');
	let result = $state<DecodedCsr | null>(null);
	let error = $state('');
	let loading = $state(false);
	let collapsed = $state(false);
	let resultRegion: HTMLDivElement | undefined = $state();

	async function decode() {
		loading = true;
		error = '';
		result = null;
		try {
			result = await decodeCsr(input.trim());
			collapsed = true;
			await tick();
			resultRegion?.focus();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			collapsed = false;
		} finally {
			loading = false;
		}
	}

	const commonName = $derived(
		result?.subjectParts.find((p) => p.key === 'CN')?.value ?? result?.subject ?? ''
	);

	/** What the request asks for: the names it covers, and whether it wants a CA. */
	const requested = $derived(
		result
			? [
					result.subjectAltNames.length === 1
						? '1 alternative name'
						: result.subjectAltNames.length > 1
							? `${result.subjectAltNames.length} alternative names`
							: '',
					result.basicConstraints?.ca ? 'requests a CA certificate' : ''
				]
					.filter(Boolean)
					.join(' · ')
			: ''
	);
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	bind:collapsed
	summary={commonName ? `${commonName} · signing request` : ''}
	{loading}
	ondecode={decode}
	derLabel="CERTIFICATE REQUEST"
	example={TEST_CSR}
	placeholder="Paste a PKCS#10 request here (-----BEGIN CERTIFICATE REQUEST-----)…"
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
				title={commonName}
				lead="Key"
				value={result.publicKey.label}
				note={`signed with ${result.signatureAlgorithm}`}
				meta={requested || 'PKCS#10 signing request'}
				badges={csrBadges}
			/>

			<section class="px-5 py-4">
				<h3
					class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-500"
				>
					Identity
				</h3>
				<RowList rows={[{ label: 'Subject', value: result.subject || '-', mono: true }]} />
			</section>

			<section class="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
				<h3
					class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-500"
				>
					Key & signature
				</h3>
				<RowList
					rows={[
						{ label: 'Public key', value: result.publicKey.label },
						{ label: 'Signature algorithm', value: result.signatureAlgorithm }
					]}
				/>
			</section>

			{#if result.subjectAltNames.length || result.extendedKeyUsage.length || result.basicConstraints}
				<section class="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
					<h3
						class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-500"
					>
						Requested extensions
					</h3>
					<div class="space-y-3">
						{#if result.subjectAltNames.length}
							<div>
								<p class="mb-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
									Subject Alternative Names
								</p>
								<div class="flex flex-wrap gap-1.5">
									{#each result.subjectAltNames as san (san.type + san.value)}
										<Badge tone="accent">{san.type}: {san.value}</Badge>
									{/each}
								</div>
							</div>
						{/if}
						{#if result.extendedKeyUsage.length}
							<div>
								<p class="mb-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
									Extended Key Usage
								</p>
								<div class="flex flex-wrap gap-1.5">
									{#each result.extendedKeyUsage as eku (eku)}
										<Badge tone="info">{eku}</Badge>
									{/each}
								</div>
							</div>
						{/if}
						{#if result.basicConstraints}
							<RowList
								rows={[
									{
										label: 'Basic Constraints',
										value: result.basicConstraints.ca
											? `CA${result.basicConstraints.pathLength !== undefined ? `, path length ${result.basicConstraints.pathLength}` : ''}`
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
