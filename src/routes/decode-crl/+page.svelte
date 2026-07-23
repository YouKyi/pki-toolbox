<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { decodeCrl, type DecodedCrl } from '$lib/pki/crl';
	import { formatDate } from '$lib/pki/format';
	import { TEST_CRL } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import RowList from '$lib/components/RowList.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const tool = requireTool('decode-crl');

	const MAX_ROWS = 250;

	let input = $state('');
	let result = $state<DecodedCrl | null>(null);
	let error = $state('');

	function decode() {
		error = '';
		result = null;
		try {
			result = decodeCrl(input.trim());
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	ondecode={decode}
	decodeLabel="Decode the CRL"
	derLabel="X509 CRL"
	example={TEST_CRL}
	placeholder="Paste a CRL here (-----BEGIN X509 CRL-----)…"
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
					class="yk-chip grid h-9 w-9 place-items-center bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
				>
					<Icon name="ban" size={20} />
				</span>
				<div class="min-w-0 flex-1">
					<p class="font-semibold text-slate-900 dark:text-slate-100">
						Revocation list, {result.entryCount} revoked certificate{result.entryCount > 1
							? 's'
							: ''}
					</p>
				</div>
			</header>
			<div class="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
				<RowList
					rows={[
						{ label: 'Issuer', value: result.issuer, mono: true },
						{ label: 'Signature algorithm', value: result.signatureAlgorithm },
						{ label: 'Issued on', value: formatDate(result.thisUpdate), mono: true },
						{
							label: 'Next update',
							value: result.nextUpdate ? formatDate(result.nextUpdate) : '-',
							mono: true
						}
					]}
				/>
			</div>
		</article>

		{#if result.entries.length}
			<div
				class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
			>
				<table class="w-full text-left text-sm">
					<thead
						class="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:text-slate-500"
					>
						<tr>
							<th class="px-5 py-2.5 font-semibold">Serial number</th>
							<th class="px-5 py-2.5 font-semibold">Revocation date</th>
							<th class="px-5 py-2.5 font-semibold">Reason</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
						{#each result.entries.slice(0, MAX_ROWS) as entry (entry.serialNumber + entry.revocationDate)}
							<tr>
								<td class="px-5 py-2 font-mono text-[13px] break-all">{entry.serialNumber}</td>
								<td class="px-5 py-2 font-mono text-[13px]">{formatDate(entry.revocationDate)}</td>
								<td class="px-5 py-2">{entry.reason}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if result.entries.length > MAX_ROWS}
					<p
						class="border-t border-slate-200 px-5 py-2 text-xs text-slate-500 dark:border-slate-800"
					>
						{result.entries.length - MAX_ROWS} additional entr{result.entries.length - MAX_ROWS > 1
							? 'ies'
							: 'y'} not shown.
					</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>
