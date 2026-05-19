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

<svelte:head><title>{tool.name} — pki-toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	{loading}
	ondecode={decode}
	decodeLabel="Décoder la chaîne"
	example={TEST_CHAIN}
	placeholder="Collez ici plusieurs certificats PEM concaténés (feuille → … → racine)…"
/>

<div class="mt-6 space-y-4">
	{#if error}
		<Alert variant="error" title="Échec du décodage">{error}</Alert>
	{/if}

	{#if result}
		{#if result.complete}
			<Alert variant="success" title="Chaîne valide">
				Les {result.links.length} certificats s'enchaînent correctement et la chaîne se termine par une
				racine auto-signée.
			</Alert>
		{:else}
			<Alert variant="warn" title="Chaîne incomplète ou non ordonnée">
				Un lien émetteur ↔ sujet ne correspond pas, ou la chaîne ne se termine pas par une racine
				auto-signée. Vérifiez l'ordre des certificats (feuille en premier, racine en dernier).
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
								Émis par le certificat #{link.index + 2}
							</span>
						{:else}
							<span class="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
								<Icon name="close" size={16} />
								L'émetteur ne correspond pas au sujet du certificat #{link.index + 2}
							</span>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
