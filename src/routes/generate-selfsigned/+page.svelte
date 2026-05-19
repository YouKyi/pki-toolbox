<script lang="ts">
	import { requireTool } from '$lib/tools';
	import {
		generateSelfSigned,
		KEY_ALGORITHM_LABELS,
		type KeyAlgorithmChoice
	} from '$lib/pki/generate';
	import { decodeCertificate, type DecodedCertificate } from '$lib/pki/parse';
	import { downloadText } from '$lib/download';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import CertCard from '$lib/components/CertCard.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const tool = requireTool('generate-selfsigned');

	const algorithms = Object.entries(KEY_ALGORITHM_LABELS) as [KeyAlgorithmChoice, string][];
	const inputClass =
		'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500/40 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

	let commonName = $state('example.local');
	let organization = $state('');
	let country = $state('');
	let keyAlgorithm = $state<KeyAlgorithmChoice>('ec-p256');
	let validityDays = $state(365);
	let sansText = $state('example.local, www.example.local');
	let isCa = $state(false);

	let result = $state<{
		cert: DecodedCertificate;
		certificatePem: string;
		privateKeyPem: string;
	} | null>(null);
	let error = $state('');
	let loading = $state(false);
	let copied = $state('');

	async function generate() {
		loading = true;
		error = '';
		result = null;
		try {
			const generated = await generateSelfSigned({
				commonName,
				organization,
				country,
				keyAlgorithm,
				validityDays,
				sans: sansText.split(/[\n,]+/),
				isCa
			});
			const cert = await decodeCertificate(generated.certificatePem);
			result = { cert, ...generated };
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	async function copy(text: string, id: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = id;
			setTimeout(() => {
				if (copied === id) copied = '';
			}, 1200);
		} catch {
			/* clipboard unavailable */
		}
	}
</script>

<svelte:head><title>{tool.name}, pki-toolbox</title></svelte:head>

<ToolHeader {tool} />

<div
	class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
>
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Common Name (CN) *</span>
			<input bind:value={commonName} class={inputClass} placeholder="example.local" />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Organization (O)</span>
			<input bind:value={organization} class={inputClass} placeholder="(optional)" />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Country (C)</span>
			<input bind:value={country} class={inputClass} placeholder="FR" maxlength="2" />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Key algorithm</span>
			<select bind:value={keyAlgorithm} class={inputClass}>
				{#each algorithms as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Validity (days)</span>
			<input type="number" bind:value={validityDays} min="1" max="7300" class={inputClass} />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">
				Subject Alternative Names (DNS)
			</span>
			<input bind:value={sansText} class={inputClass} placeholder="example.com, www.example.com" />
		</label>
	</div>

	<label class="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
		<input
			type="checkbox"
			bind:checked={isCa}
			class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/40 dark:border-slate-600"
		/>
		Certificate authority (CA), Basic Constraints cA = true
	</label>

	<button
		type="button"
		onclick={generate}
		disabled={loading || !commonName.trim()}
		class="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 focus:ring-2 focus:ring-teal-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
	>
		<Icon name={loading ? 'clock' : 'sparkles'} size={16} />
		{loading ? 'Generating…' : 'Generate the certificate'}
	</button>
	<p class="mt-2 text-xs text-slate-400 dark:text-slate-500">
		The key pair is generated locally via WebCrypto, the private key never leaves this page.
	</p>
</div>

<div class="mt-6 space-y-4">
	{#if error}
		<Alert variant="error" title="Generation failed">{error}</Alert>
	{/if}

	{#if result}
		<CertCard cert={result.cert} />

		{#snippet pemBlock(title: string, value: string, id: string, filename: string)}
			<article
				class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
			>
				<header class="flex items-center justify-between px-5 py-3">
					<span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</span>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => copy(value, id)}
							class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
						>
							<Icon name={copied === id ? 'check' : 'copy'} size={13} />
							{copied === id ? 'Copied' : 'Copy'}
						</button>
						<button
							type="button"
							onclick={() => downloadText(filename, value, 'application/x-pem-file')}
							class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
						>
							<Icon name="upload" size={13} class="rotate-180" /> Download
						</button>
					</div>
				</header>
				<pre
					class="max-h-56 overflow-auto border-t border-slate-200 bg-slate-50 p-4 font-mono text-[12px] leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">{value}</pre>
			</article>
		{/snippet}

		{@render pemBlock('Certificate (PEM)', result.certificatePem, 'cert', 'certificate.crt')}

		<Alert variant="warn" title="Private key">
			Keep this private key in a safe place and never share it. It is shown only here and is stored
			nowhere.
		</Alert>

		{@render pemBlock('Private key (PEM, PKCS#8)', result.privateKeyPem, 'key', 'private-key.key')}
	{/if}
</div>
