<script lang="ts">
	/** Renders one decoded X.509 certificate as a sectioned card. */
	import type { Snippet } from 'svelte';
	import type { DecodedCertificate } from '$lib/pki/parse';
	import type { ChainRole } from '$lib/pki/chain';
	import { formatDate, formatSerial, hexWithColons } from '$lib/pki/format';
	import RowList, { type Row } from './RowList.svelte';
	import Badge, { type BadgeTone } from './Badge.svelte';
	import VerdictBand from './VerdictBand.svelte';

	let { cert, role, index }: { cert: DecodedCertificate; role?: ChainRole; index?: number } =
		$props();

	const ROLE_LABEL: Record<ChainRole, string> = {
		leaf: 'Leaf certificate',
		intermediate: 'Intermediate CA',
		root: 'Root CA'
	};

	const VALIDITY: Record<DecodedCertificate['validity'], { tone: BadgeTone; label: string }> = {
		valid: { tone: 'valid', label: 'Valid' },
		expired: { tone: 'expired', label: 'Expired' },
		'not-yet-valid': { tone: 'pending', label: 'Not yet valid' }
	};

	const commonName = $derived(
		cert.subjectParts.find((p) => p.key === 'CN')?.value ?? cert.subject ?? '(no subject)'
	);

	const issuerName = $derived(
		cert.issuerParts.find((p) => p.key === 'CN')?.value ?? cert.issuer ?? '(no issuer)'
	);

	/** Days read as a count, not as a wall of digits: 3214 → "3,214". */
	const days = $derived(new Intl.NumberFormat('en').format(Math.abs(cert.daysUntilExpiry)));

	/**
	 * The verdict line answers the question that brought the user here, and it
	 * answers it with an ABSOLUTE date — a relative day count is a number nobody
	 * plans against. The relative form trails as context, not as the answer.
	 */
	const verdict = $derived(
		cert.validity === 'valid'
			? { lead: 'Expires', date: formatDate(cert.notAfter), note: `in ${days} days` }
			: cert.validity === 'expired'
				? { lead: 'Expired', date: formatDate(cert.notAfter), note: `${days} days ago` }
				: { lead: 'Starts', date: formatDate(cert.notBefore), note: 'not valid yet' }
	);

	const coverage = $derived(
		cert.subjectAltNames.length === 1
			? '1 alternative name'
			: cert.subjectAltNames.length > 1
				? `${cert.subjectAltNames.length} alternative names`
				: ''
	);

	/** Self-signed is already stated by its badge; repeating it wastes the line. */
	const provenance = $derived(
		[cert.isSelfSigned ? '' : `Issued by ${issuerName}`, coverage].filter(Boolean).join(' · ')
	);

	const identity: Row[] = $derived([
		{ label: 'Subject', value: cert.subject || '-', mono: true },
		{ label: 'Issuer', value: cert.issuer || '-', mono: true },
		{ label: 'Serial number', value: formatSerial(cert.serialNumber), mono: true, copy: true }
	]);

	const keyRows: Row[] = $derived([
		{ label: 'Public key', value: cert.publicKey.label },
		{ label: 'Signature algorithm', value: cert.signatureAlgorithm },
		{ label: 'Certificate authority', value: cert.isCA ? 'Yes' : 'No' },
		...(cert.basicConstraints?.pathLength !== undefined
			? [{ label: 'Path length', value: String(cert.basicConstraints.pathLength) }]
			: [])
	]);

	const fingerprints: Row[] = $derived([
		{ label: 'SHA-1', value: hexWithColons(cert.fingerprints.sha1), mono: true, copy: true },
		{ label: 'SHA-256', value: hexWithColons(cert.fingerprints.sha256), mono: true, copy: true },
		{ label: 'SHA-512', value: hexWithColons(cert.fingerprints.sha512), mono: true, copy: true }
	]);
</script>

{#snippet section(title: string, body: Snippet)}
	<section class="border-t border-slate-200 px-5 py-4 first:border-t-0 dark:border-slate-800">
		<h3
			class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-500"
		>
			{title}
		</h3>
		{@render body()}
	</section>
{/snippet}

{#snippet chips(items: string[], tone: BadgeTone)}
	<div class="flex flex-wrap gap-1.5">
		{#each items as item (item)}
			<Badge {tone}>{item}</Badge>
		{/each}
	</div>
{/snippet}

<article
	class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
>
	<!-- Three questions bring a user to a certificate decoder — what is it, when
	     does it expire, who signed it — and the band answers all three above the
	     fifteen rows that answer everything else. -->
	{#snippet certBadges()}
		{#if role}<Badge tone={role}>{ROLE_LABEL[role]}</Badge>{/if}
		{#if cert.isCA && !role}<Badge tone="info">CA</Badge>{/if}
		{#if cert.isSelfSigned}<Badge tone="neutral">Self-signed</Badge>{/if}
		<Badge tone={VALIDITY[cert.validity].tone}>{VALIDITY[cert.validity].label}</Badge>
	{/snippet}
	<VerdictBand
		icon="certificate"
		title={commonName}
		{index}
		lead={verdict.lead}
		value={verdict.date}
		datetime={cert.notAfter.toISOString()}
		note={verdict.note}
		meta={provenance}
		badges={certBadges}
	/>

	{#snippet identityBody()}<RowList rows={identity} />{/snippet}
	{@render section('Identity', identityBody)}

	{#snippet validityBody()}
		<RowList
			rows={[
				{ label: 'Valid from', value: formatDate(cert.notBefore), mono: true },
				{ label: 'Valid until', value: formatDate(cert.notAfter), mono: true }
			]}
		/>
	{/snippet}
	{@render section('Validity', validityBody)}

	{#snippet keyBody()}<RowList rows={keyRows} />{/snippet}
	{@render section('Key & signature', keyBody)}

	{#if cert.subjectAltNames.length || cert.keyUsage.length || cert.extendedKeyUsage.length || cert.extensions.length}
		{#snippet extBody()}
			<div class="space-y-3">
				{#if cert.subjectAltNames.length}
					<div>
						<p class="mb-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
							Subject Alternative Names
						</p>
						{@render chips(
							cert.subjectAltNames.map((s) => `${s.type}: ${s.value}`),
							'accent'
						)}
					</div>
				{/if}
				{#if cert.keyUsage.length}
					<div>
						<p class="mb-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">Key Usage</p>
						{@render chips(cert.keyUsage, 'info')}
					</div>
				{/if}
				{#if cert.extendedKeyUsage.length}
					<div>
						<p class="mb-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
							Extended Key Usage
						</p>
						{@render chips(cert.extendedKeyUsage, 'info')}
					</div>
				{/if}
				{#if cert.extensions.length}
					<div>
						<p class="mb-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
							Extensions present
						</p>
						{@render chips(
							cert.extensions.map((e) => (e.critical ? `${e.name} (critical)` : e.name)),
							'neutral'
						)}
					</div>
				{/if}
			</div>
		{/snippet}
		{@render section('Extensions', extBody)}
	{/if}

	{#snippet fpBody()}<RowList rows={fingerprints} />{/snippet}
	{@render section('Fingerprints (DER)', fpBody)}
</article>
