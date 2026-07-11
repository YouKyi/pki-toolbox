<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { decodeCsr, type DecodedCsr } from '$lib/pki/parse';
	import { TEST_CSR } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import RowList from '$lib/components/RowList.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const tool = requireTool('decode-csr');

	let input = $state('');
	let result = $state<DecodedCsr | null>(null);
	let error = $state('');
	let loading = $state(false);

	async function decode() {
		loading = true;
		error = '';
		result = null;
		try {
			result = await decodeCsr(input.trim());
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	const commonName = $derived(
		result?.subjectParts.find((p) => p.key === 'CN')?.value ?? result?.subject ?? ''
	);
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	{loading}
	ondecode={decode}
	derLabel="CERTIFICATE REQUEST"
	example={TEST_CSR}
	placeholder="Paste a PKCS#10 request here (-----BEGIN CERTIFICATE REQUEST-----)…"
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
					<Icon name="file-text" size={20} />
				</span>
				<div class="min-w-0 flex-1">
					<p class="truncate font-semibold text-slate-900 dark:text-slate-100">{commonName}</p>
					<p class="text-xs text-slate-500 dark:text-slate-500">PKCS#10 signing request</p>
				</div>
				<Badge tone="accent">CSR</Badge>
			</header>

			<section class="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
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
