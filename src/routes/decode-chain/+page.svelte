<script lang="ts">
	import { tick } from 'svelte';
	import { revealResult } from '$lib/reveal';
	import { requireTool } from '$lib/tools';
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

	let input = $state('');
	let result = $state<DecodedChain | null>(null);
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
			result = await decodeChain(input.trim());
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

	const length = $derived(
		result
			? result.links.length === 1
				? '1 certificate'
				: `${result.links.length} certificates`
			: ''
	);

	/** The leaf is what the chain is actually about; it names the whole result. */
	const leafName = $derived(
		result?.links[0]?.certificate.subjectParts.find((p) => p.key === 'CN')?.value ??
			result?.links[0]?.certificate.subject ??
			'Certificate chain'
	);

	/** One sentence for assistive technology; the card carries the detail. */
	const status = $derived(
		error
			? `Decoding failed: ${error}`
			: result
				? `Chain decoded: ${length}, ${result.complete ? 'every signature verified' : 'a link could not be verified'}`
				: ''
	);
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	invalid={Boolean(error)}
	{errorId}
	bind:collapsed
	summary={result ? `${leafName} · chain of ${length}` : ''}
	{loading}
	ondecode={decode}
	decodeLabel="Decode the chain"
	example={TEST_CHAIN}
	placeholder="Paste several concatenated PEM certificates here (leaf → … → root)…"
/>

<div bind:this={resultRegion} id="result" tabindex="-1" class="mt-6 space-y-4 outline-none">
	<StatusLine message={status} />
	{#if error}
		<Alert id={errorId} variant="error" title="Decoding failed">{error}</Alert>
	{/if}

	{#if result}
		<!-- One question owns this tool: does the chain hold. The band answers it,
		     and the alert below stays only when there is something to fix. -->
		<article
			class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			{#snippet chainBadges()}
				{#if result?.complete}<Badge tone="valid">Verified</Badge>
				{:else}<Badge tone="expired">Incomplete</Badge>{/if}
			{/snippet}
			<VerdictBand
				icon="link"
				title={leafName}
				lead="Chain of"
				value={length}
				note={result.complete ? 'every signature verified' : 'a link could not be verified'}
				meta={result.complete
					? 'Ends with a valid self-signed root'
					: 'Does not end with a valid self-signed root'}
				badges={chainBadges}
			/>
		</article>

		{#if !result.complete}
			<Alert variant="warn" title="Incomplete or unordered chain">
				A signature could not be verified, or the chain does not end with a valid self-signed root.
				Check the order of the certificates (leaf first, root last).
			</Alert>
		{/if}

		<div class="space-y-0">
			{#each result.links as link (link.index)}
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
