<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { decodeChain, type DecodedChain } from '$lib/pki/chain';
	import { TEST_CHAIN } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import CertCard from '$lib/components/CertCard.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const tool = requireTool('decode-chain');

	let input = $state('');
	let result = $state<DecodedChain | null>(null);
	let error = $state('');
	let loading = $state(false);

	async function decode() {
		loading = true;
		error = '';
		result = null;
		try {
			result = await decodeChain(input.trim());
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	{loading}
	ondecode={decode}
	decodeLabel="Decode the chain"
	example={TEST_CHAIN}
	placeholder="Paste several concatenated PEM certificates here (leaf → … → root)…"
/>

<div class="mt-6 space-y-4">
	{#if error}
		<Alert variant="error" title="Decoding failed">{error}</Alert>
	{/if}

	{#if result}
		{#if result.complete}
			<Alert variant="success" title="Valid chain">
				The {result.links.length} certificates link together correctly: every signature has been verified
				cryptographically, and the chain ends with a valid self-signed root.
			</Alert>
		{:else}
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
