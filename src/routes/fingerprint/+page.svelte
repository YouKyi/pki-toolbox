<script lang="ts">
	import { tick } from 'svelte';
	import { revealResult } from '$lib/reveal';
	import { requireTool } from '$lib/tools';
	import { decodeCertificate, type DecodedCertificate } from '$lib/pki/parse';
	import { hexWithColons } from '$lib/pki/format';
	import { ISRG_ROOT_X1 } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import StatusLine from '$lib/components/StatusLine.svelte';
	import RowList from '$lib/components/RowList.svelte';
	import VerdictBand from '$lib/components/VerdictBand.svelte';

	const tool = requireTool('fingerprint');

	let input = $state('');
	let result = $state<DecodedCertificate | null>(null);
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
			result = await decodeCertificate(input.trim());
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

	const commonName = $derived(
		result?.subjectParts.find((p) => p.key === 'CN')?.value ?? result?.subject ?? ''
	);

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

	/** One sentence for assistive technology; the card carries the detail. */
	const status = $derived(
		error ? `Decoding failed: ${error}` : result ? `Fingerprints computed for ${commonName}` : ''
	);
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	invalid={Boolean(error)}
	{errorId}
	bind:collapsed
	summary={commonName ? `${commonName} · certificate` : ''}
	{loading}
	ondecode={decode}
	decodeLabel="Compute fingerprints"
	example={ISRG_ROOT_X1}
/>

<div bind:this={resultRegion} id="result" tabindex="-1" class="mt-6 space-y-4 outline-none">
	<StatusLine message={status} />
	{#if error}
		<Alert id={errorId} variant="error" title="Decoding failed">{error}</Alert>
	{/if}

	{#if result}
		<article
			class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			<!-- The digests themselves are the answer, and they are one row below;
			     the band names what was hashed and over how much. -->
			<VerdictBand
				icon="fingerprint"
				title={commonName}
				lead="Computed over"
				value={`${result.der.length} bytes`}
				note="the certificate's complete DER"
				meta={result.subject}
			/>
			<div class="px-5 py-4">
				<RowList rows={fingerprintRows} />
			</div>
		</article>
		<Alert variant="info">
			Fingerprints are digests of the certificate's complete DER, the same value shown by a browser
			or by <code class="font-mono text-xs">openssl x509 -fingerprint</code>.
		</Alert>
	{/if}
</div>
