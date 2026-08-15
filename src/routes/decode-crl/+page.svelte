<script lang="ts">
	import { tick } from 'svelte';
	import { requireTool } from '$lib/tools';
	import { decodeCrl, type DecodedCrl } from '$lib/pki/crl';
	import { formatDate } from '$lib/pki/format';
	import { TEST_CRL } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import RowList from '$lib/components/RowList.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import VerdictBand from '$lib/components/VerdictBand.svelte';

	const tool = requireTool('decode-crl');

	const MAX_ROWS = 250;
	const DAY_MS = 86_400_000;

	let input = $state('');
	let result = $state<DecodedCrl | null>(null);
	let error = $state('');
	let collapsed = $state(false);
	let resultRegion: HTMLDivElement | undefined = $state();

	async function decode() {
		error = '';
		result = null;
		try {
			result = decodeCrl(input.trim());
			collapsed = true;
			await tick();
			resultRegion?.focus();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			collapsed = false;
		}
	}

	/** The issuer's CN if the DN carries one; the whole DN is for the rows below. */
	const issuerName = $derived(
		result ? (/CN=([^,]+)/.exec(result.issuer)?.[1]?.trim() ?? result.issuer) : ''
	);

	const revoked = $derived(
		result
			? result.entryCount === 1
				? '1 revoked certificate'
				: `${result.entryCount} revoked certificates`
			: ''
	);

	/**
	 * A CRL past its next update is stale, and a stale CRL is the reason someone
	 * opens this tool at 2am. The band says so before the entry table does.
	 */
	const freshness = $derived.by(() => {
		if (!result?.nextUpdate) return { note: 'no next update announced', overdue: false };
		const days = Math.round((result.nextUpdate.getTime() - Date.now()) / DAY_MS);
		const count = new Intl.NumberFormat('en').format(Math.abs(days));
		return days < 0
			? { note: `overdue by ${count} days`, overdue: true }
			: { note: days === 0 ? 'due today' : `in ${count} days`, overdue: false };
	});
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={input}
	bind:collapsed
	summary={issuerName ? `${issuerName} · revocation list` : ''}
	ondecode={decode}
	decodeLabel="Decode the CRL"
	derLabel="X509 CRL"
	example={TEST_CRL}
	placeholder="Paste a CRL here (-----BEGIN X509 CRL-----)…"
/>

<div
	bind:this={resultRegion}
	tabindex="-1"
	class="mt-6 space-y-4 outline-none"
	aria-live="polite"
	aria-atomic="false"
>
	{#if error}
		<Alert variant="error" title="Decoding failed">{error}</Alert>
	{/if}

	{#if result}
		<article
			class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			{#snippet crlBadges()}
				{#if freshness.overdue}<Badge tone="expired">Overdue</Badge>
				{:else if result?.nextUpdate}<Badge tone="valid">Current</Badge>{/if}
			{/snippet}
			<VerdictBand
				icon="ban"
				title={issuerName}
				lead="Next update"
				value={result.nextUpdate ? formatDate(result.nextUpdate) : 'not announced'}
				datetime={result.nextUpdate?.toISOString()}
				note={freshness.note}
				meta={`${revoked} · issued ${formatDate(result.thisUpdate)}`}
				badges={crlBadges}
			/>
			<div class="px-5 py-4">
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
						class="border-b border-slate-200 text-xs tracking-wide text-ink-3 uppercase dark:border-slate-800"
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
