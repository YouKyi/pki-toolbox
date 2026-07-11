<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { decodeCertificate, type DecodedCertificate } from '$lib/pki/parse';
	import { hexWithColons } from '$lib/pki/format';
	import { ISRG_ROOT_X1 } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import RowList from '$lib/components/RowList.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const tool = requireTool('fingerprint');

	let input = $state('');
	let result = $state<DecodedCertificate | null>(null);
	let error = $state('');
	let loading = $state(false);

	async function decode() {
		loading = true;
		error = '';
		result = null;
		try {
			result = await decodeCertificate(input.trim());
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	const fingerprintRows = $derived(
		result
			? [
					{
						label: 'SHA-1',
						value: hexWithColons(result.fingerprints.sha1),
						mono: true,
						copy: true
					},
					{
						label: 'SHA-256',
						value: hexWithColons(result.fingerprints.sha256),
						mono: true,
						copy: true
					},
					{
						label: 'SHA-512',
						value: hexWithColons(result.fingerprints.sha512),
						mono: true,
						copy: true
					}
				]
			: []
	);
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	{loading}
	ondecode={decode}
	decodeLabel="Compute fingerprints"
	example={ISRG_ROOT_X1}
/>

<div class="mt-6 space-y-4" aria-live="polite" aria-atomic="false">
	{#if error}
		<Alert variant="error" title="Decoding failed">{error}</Alert>
	{/if}

	{#if result}
		<article
			class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			<header class="flex items-center gap-3 px-5 py-4">
				<span
					class="grid h-9 w-9 place-items-center yk-chip bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
				>
					<Icon name="fingerprint" size={20} />
				</span>
				<div class="min-w-0 flex-1">
					<p class="truncate font-semibold text-slate-900 dark:text-slate-100">{result.subject}</p>
					<p class="text-xs text-slate-500 dark:text-slate-500">
						Fingerprints computed over {result.der.length} bytes of DER
					</p>
				</div>
			</header>
			<div class="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
				<RowList rows={fingerprintRows} />
			</div>
		</article>
		<Alert variant="info">
			Fingerprints are digests of the certificate's complete DER, the same value shown by a browser
			or by <code class="font-mono text-xs">openssl x509 -fingerprint</code>.
		</Alert>
	{/if}
</div>
