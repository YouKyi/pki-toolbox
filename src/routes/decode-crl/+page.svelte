<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { createDecodeFlow } from '$lib/decodeFlow.svelte';
	import { decodeCrl, type DecodedCrl } from '$lib/pki/crl';
	import { formatDate } from '$lib/pki/format';
	import { TEST_CRL } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import StatusLine from '$lib/components/StatusLine.svelte';
	import RowList from '$lib/components/RowList.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import VerdictBand from '$lib/components/VerdictBand.svelte';

	const tool = requireTool('decode-crl');

	const MAX_ROWS = 250;
	const DAY_MS = 86_400_000;

	/** The issuer's CN if the DN carries one; the whole DN is for the rows below. */
	const issuerName = (c: DecodedCrl) => /CN=([^,]+)/.exec(c.issuer)?.[1]?.trim() ?? c.issuer;

	const revoked = (c: DecodedCrl) =>
		c.entryCount === 1 ? '1 revoked certificate' : `${c.entryCount} revoked certificates`;

	/**
	 * A CRL past its next update is stale, and a stale CRL is the reason someone
	 * opens this tool at 2am. The band says so before the entry table does.
	 */
	function freshness(c: DecodedCrl): { note: string; overdue: boolean } {
		if (!c.nextUpdate) return { note: 'no next update announced', overdue: false };
		const days = Math.round((c.nextUpdate.getTime() - Date.now()) / DAY_MS);
		const count = new Intl.NumberFormat('en').format(Math.abs(days));
		return days < 0
			? { note: `overdue by ${count} days`, overdue: true }
			: { note: days === 0 ? 'due today' : `in ${count} days`, overdue: false };
	}

	const flow = createDecodeFlow({
		run: (input) => decodeCrl(input),
		summary: (c) => `${issuerName(c)} · revocation list`,
		announce: (c) => `Revocation list decoded: ${revoked(c)}, next update ${freshness(c).note}`
	});
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<PemInput
	bind:value={flow.input}
	bind:collapsed={flow.collapsed}
	invalid={Boolean(flow.error)}
	errorId={flow.errorId}
	summary={flow.summary}
	loading={flow.loading}
	ondecode={() => flow.decode()}
	decodeLabel="Decode the CRL"
	derLabel="X509 CRL"
	example={TEST_CRL}
	placeholder="Paste a CRL here (-----BEGIN X509 CRL-----)…"
/>

<div bind:this={flow.region} id="result" tabindex="-1" class="mt-6 space-y-4 outline-none">
	<StatusLine message={flow.status} />
	{#if flow.error}
		<Alert id={flow.errorId} variant="error" title={flow.failureLabel}>{flow.error}</Alert>
	{/if}

	{#if flow.result}
		{@const crl = flow.result}
		{@const fresh = freshness(crl)}
		<article
			class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			{#snippet crlBadges()}
				{#if fresh.overdue}<Badge tone="expired">Overdue</Badge>
				{:else if crl.nextUpdate}<Badge tone="valid">Current</Badge>{/if}
			{/snippet}
			<VerdictBand
				icon="ban"
				title={issuerName(crl)}
				lead="Next update"
				value={crl.nextUpdate ? formatDate(crl.nextUpdate) : 'not announced'}
				datetime={crl.nextUpdate?.toISOString()}
				note={fresh.note}
				meta={`${revoked(crl)} · issued ${formatDate(crl.thisUpdate)}`}
				badges={crlBadges}
			/>
			<div class="px-5 py-4">
				<RowList
					rows={[
						{ label: 'Issuer', value: crl.issuer, mono: true },
						{ label: 'Signature algorithm', value: crl.signatureAlgorithm },
						{ label: 'Issued on', value: formatDate(crl.thisUpdate), mono: true },
						{
							label: 'Next update',
							value: crl.nextUpdate ? formatDate(crl.nextUpdate) : '-',
							mono: true
						}
					]}
				/>
			</div>
		</article>

		{#if crl.entries.length}
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
						{#each crl.entries.slice(0, MAX_ROWS) as entry (entry.serialNumber + entry.revocationDate)}
							<tr>
								<td class="px-5 py-2 font-mono text-[13px] break-all">{entry.serialNumber}</td>
								<td class="px-5 py-2 font-mono text-[13px]">{formatDate(entry.revocationDate)}</td>
								<td class="px-5 py-2">{entry.reason}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if crl.entries.length > MAX_ROWS}
					<p
						class="border-t border-slate-200 px-5 py-2 text-xs text-slate-500 dark:border-slate-800"
					>
						{crl.entries.length - MAX_ROWS} additional entr{crl.entries.length - MAX_ROWS > 1
							? 'ies'
							: 'y'} not shown.
					</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>
