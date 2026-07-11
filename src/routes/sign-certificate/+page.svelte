<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { importCa, issueCertificate, type CaContext } from '$lib/pki/sign';
	import { KEY_ALGORITHM_LABELS, type KeyAlgorithmChoice } from '$lib/pki/generate';
	import { decodeCsr } from '$lib/pki/parse';
	import type { IssuedCertificate } from '$lib/pki/sign';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import PemOutput from '$lib/components/PemOutput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const tool = requireTool('sign-certificate');

	const algorithms = Object.entries(KEY_ALGORITHM_LABELS) as [KeyAlgorithmChoice, string][];
	const inputClass =
		'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500/40 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

	// --- CA material ---
	let caCertPem = $state('');
	let caKeyPem = $state('');
	let ca = $state<CaContext | null>(null);
	let caError = $state('');
	let caLoading = $state(false);

	async function loadCa() {
		caLoading = true;
		caError = '';
		try {
			ca = await importCa(caCertPem, caKeyPem);
		} catch (e) {
			caError = e instanceof Error ? e.message : String(e);
		} finally {
			caLoading = false;
		}
	}

	// --- Subject ---
	let mode = $state<'generate' | 'csr'>('generate');
	let csrPem = $state('');
	let csrError = $state('');
	let commonName = $state('service.internal');
	let organization = $state('');
	let country = $state('');
	let keyAlgorithm = $state<KeyAlgorithmChoice>('ec-p256');
	let validityDays = $state(365);
	let sansText = $state('service.internal');
	let isCa = $state(false);

	async function readCsr() {
		csrError = '';
		try {
			const csr = await decodeCsr(csrPem);
			const part = (key: string) => csr.subjectParts.find((p) => p.key === key)?.value ?? '';
			commonName = part('CN');
			organization = part('O');
			country = part('C');
			sansText = csr.subjectAltNames
				.filter((s) => s.type.toLowerCase().includes('dns'))
				.map((s) => s.value)
				.join(', ');
		} catch (e) {
			csrError = e instanceof Error ? e.message : String(e);
		}
	}

	// --- Result ---
	let result = $state<IssuedCertificate | null>(null);
	let signError = $state('');
	let signing = $state(false);

	// Editing the CA material invalidates the previously loaded CA and any
	// previously issued result, which was signed by the old CA.
	$effect(() => {
		void caCertPem;
		void caKeyPem;
		ca = null;
		caError = '';
		result = null;
		signError = '';
	});

	async function sign() {
		if (!ca) return;
		signing = true;
		signError = '';
		result = null;
		try {
			result = await issueCertificate(ca, {
				commonName,
				organization,
				country,
				validityDays,
				sans: sansText.split(/[\n,]+/),
				isCa,
				subject: mode === 'csr' ? { kind: 'csr', csrPem } : { kind: 'generate', keyAlgorithm }
			});
		} catch (e) {
			signError = e instanceof Error ? e.message : String(e);
		} finally {
			signing = false;
		}
	}
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<!-- Block 1: CA material -->
<section
	class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
>
	<h2 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
		1. Certificate authority
	</h2>
	<div class="grid gap-4 lg:grid-cols-2">
		<div>
			<p class="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">CA certificate</p>
			<PemInput bind:value={caCertPem} derLabel="CERTIFICATE" accept=".pem,.crt,.cer,.der" />
		</div>
		<div>
			<p class="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
				CA private key (unencrypted PKCS#8)
			</p>
			<PemInput bind:value={caKeyPem} derLabel="PRIVATE KEY" accept=".pem,.key,.der" />
		</div>
	</div>

	<button
		type="button"
		onclick={loadCa}
		disabled={caLoading || !caCertPem.trim() || !caKeyPem.trim()}
		class="yk-cut mt-4 inline-flex items-center gap-2 bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-400 dark:text-[color:var(--yk-on-accent)] dark:hover:bg-teal-300"
	>
		<Icon name={caLoading ? 'clock' : 'shield'} size={16} />
		{caLoading ? 'Loading…' : 'Load the CA'}
	</button>

	<div class="mt-3 space-y-3" aria-live="polite">
		{#if caError}
			<Alert variant="error" title="CA import failed">{caError}</Alert>
		{/if}
		{#if ca}
			<Alert variant="info" title="CA loaded">
				{ca.cert.subject} — valid until {ca.cert.notAfter.toISOString().slice(0, 10)}
			</Alert>
			{#each ca.warnings as warning (warning)}
				<Alert variant="warn" title="Warning">{warning}</Alert>
			{/each}
		{/if}
	</div>
</section>

<!-- Block 2: subject -->
<section
	class="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
>
	<h2 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">2. Subject</h2>

	<div
		class="mb-4 inline-flex rounded-lg border border-slate-300 p-0.5 text-sm dark:border-slate-700"
		role="tablist"
		aria-label="Subject key source"
	>
		{#each [{ id: 'generate', label: 'New key pair' }, { id: 'csr', label: 'Sign a CSR' }] as m (m.id)}
			<button
				type="button"
				role="tab"
				aria-selected={mode === m.id}
				onclick={() => (mode = m.id as typeof mode)}
				class="rounded-md px-3 py-1.5 font-medium transition {mode === m.id
					? 'bg-teal-700 text-white dark:bg-teal-400 dark:text-[color:var(--yk-on-accent)]'
					: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}"
			>
				{m.label}
			</button>
		{/each}
	</div>

	{#if mode === 'csr'}
		<div class="mb-4">
			<p class="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
				PKCS#10 request — its subject and DNS SANs pre-fill the form below; the form wins.
			</p>
			<PemInput
				bind:value={csrPem}
				derLabel="CERTIFICATE REQUEST"
				accept=".pem,.csr,.req,.der"
				decodeLabel="Read the CSR"
				ondecode={readCsr}
			/>
			{#if csrError}
				<div class="mt-3"><Alert variant="error" title="CSR error">{csrError}</Alert></div>
			{/if}
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Common Name (CN) *</span>
			<input bind:value={commonName} required aria-required="true" class={inputClass} />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Organization (O)</span>
			<input bind:value={organization} class={inputClass} placeholder="(optional)" />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Country (C)</span>
			<input bind:value={country} class={inputClass} placeholder="FR" maxlength="2" />
		</label>
		{#if mode === 'generate'}
			<label class="flex flex-col gap-1 text-sm">
				<span class="font-medium text-slate-600 dark:text-slate-300">Key algorithm</span>
				<select bind:value={keyAlgorithm} class={inputClass}>
					{#each algorithms as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
			</label>
		{/if}
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Validity (days)</span>
			<input type="number" bind:value={validityDays} min="1" max="7300" class={inputClass} />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">
				Subject Alternative Names (DNS)
			</span>
			<input bind:value={sansText} class={inputClass} placeholder="service.internal" />
		</label>
	</div>

	<label class="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
		<input
			type="checkbox"
			bind:checked={isCa}
			class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/40 dark:border-slate-600"
		/>
		Intermediate CA, Basic Constraints cA = true
	</label>

	<button
		type="button"
		onclick={sign}
		disabled={signing || !ca || !commonName.trim() || (mode === 'csr' && !csrPem.trim())}
		class="yk-cut mt-5 inline-flex items-center gap-2 bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-400 dark:text-[color:var(--yk-on-accent)] dark:hover:bg-teal-300"
	>
		<Icon name={signing ? 'clock' : 'stamp'} size={16} />
		{signing ? 'Signing…' : 'Sign the certificate'}
	</button>
	{#if !ca}
		<p class="mt-2 text-xs text-slate-400 dark:text-slate-500">Load the CA first (step 1).</p>
	{/if}
</section>

<!-- Results -->
<div class="mt-6 space-y-4" aria-live="polite" aria-atomic="false">
	{#if signError}
		<Alert variant="error" title="Signing failed">{signError}</Alert>
	{/if}

	{#if result}
		{#each result.warnings as warning (warning)}
			<Alert variant="warn" title="Warning">{warning}</Alert>
		{/each}

		<PemOutput title="Certificate (PEM)" value={result.certificatePem} filename="certificate.crt" />

		{#if result.privateKeyPem}
			<Alert variant="warn" title="Private key">
				Keep this private key in a safe place and never share it. It is shown only here and is
				stored nowhere.
			</Alert>
			<PemOutput
				title="Private key (PEM, PKCS#8)"
				value={result.privateKeyPem}
				filename="private-key.key"
			/>
		{/if}

		<PemOutput
			title="Fullchain (certificate + CA)"
			value={result.fullchainPem}
			filename="fullchain.pem"
		/>
	{/if}
</div>
