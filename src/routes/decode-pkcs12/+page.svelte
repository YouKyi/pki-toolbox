<script lang="ts">
	import { tick } from 'svelte';
	import { revealResult } from '$lib/reveal';
	import { requireTool } from '$lib/tools';
	import { decodePkcs12, type DecodedPkcs12 } from '$lib/pki/pkcs12';
	import { TEST_PKCS12, TEST_PKCS12_PASSWORD } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import CertCard from '$lib/components/CertCard.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import VerdictBand from '$lib/components/VerdictBand.svelte';

	const tool = requireTool('decode-pkcs12');

	let input = $state('');
	let password = $state('');
	let result = $state<DecodedPkcs12 | null>(null);
	let error = $state('');
	let loading = $state(false);
	let collapsed = $state(false);
	let resultRegion: HTMLDivElement | undefined = $state();

	async function decode() {
		loading = true;
		error = '';
		result = null;
		try {
			result = await decodePkcs12(input.trim(), password);
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

	/** A keystore is opened to find out what came out of it. */
	const contents = $derived(
		result
			? [
					result.certificateCount === 1
						? '1 certificate'
						: `${result.certificateCount} certificates`,
					result.keyCount === 1 ? '1 private key' : `${result.keyCount} private keys`
				].join(', ')
			: ''
	);

	function loadExample() {
		input = TEST_PKCS12;
		password = TEST_PKCS12_PASSWORD;
	}
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<div class="mb-3 flex flex-wrap items-end gap-3">
	<label class="flex flex-col gap-1 text-sm">
		<span class="font-medium text-slate-600 dark:text-slate-300">File password</span>
		<input
			type="password"
			bind:value={password}
			autocomplete="off"
			placeholder="password…"
			class="w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500/40 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
		/>
	</label>
	<button
		type="button"
		onclick={loadExample}
		class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-400"
	>
		<Icon name="file-text" size={16} /> Load an example
	</button>
</div>

<PemInput
	bind:value={input}
	bind:collapsed
	summary={result ? `PKCS#12 keystore · ${contents}` : ''}
	{loading}
	ondecode={decode}
	decodeLabel="Decrypt"
	derLabel="PKCS12"
	placeholder="Import a .p12 / .pfx file, or paste its base64 content…"
/>

<div
	bind:this={resultRegion}
	tabindex="-1"
	class="mt-6 space-y-4 outline-none"
	aria-live="polite"
	aria-atomic="false"
>
	{#if error}
		<Alert variant="error" title="Decryption failed">{error}</Alert>
	{/if}

	{#if result}
		<article
			class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			{#snippet p12Badges()}
				{#if result?.integrityVerified}<Badge tone="valid">MAC verified</Badge>
				{:else}<Badge tone="warn">No integrity MAC</Badge>{/if}
			{/snippet}
			<VerdictBand
				icon="lock"
				title="PKCS#12 keystore"
				lead="Contains"
				value={contents}
				meta={result.integrityVerified
					? 'Password correct, MAC integrity verified'
					: 'Content decrypted; this file carries no integrity MAC'}
				badges={p12Badges}
			/>
		</article>

		{#if result.keys.length}
			<div
				class="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
			>
				<h3 class="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">Private keys</h3>
				<ul class="space-y-2">
					{#each result.keys as key, i (i)}
						<li class="flex flex-wrap items-center gap-2 text-sm">
							<Icon name="lock" size={16} class="text-slate-500" />
							<span class="font-medium text-slate-900 dark:text-slate-200">
								{key.friendlyName ?? '(no name)'}
							</span>
							{#if key.algorithm}<Badge tone="info">{key.algorithm}</Badge>{/if}
							{#if key.encrypted}<Badge tone="neutral">encrypted</Badge>{/if}
						</li>
					{/each}
				</ul>
				<p class="mt-2 text-xs text-ink-3">Private key material is never displayed.</p>
			</div>
		{/if}

		{#each result.certificates as cert, i (i)}
			<CertCard {cert} index={i} />
		{/each}
	{/if}
</div>
