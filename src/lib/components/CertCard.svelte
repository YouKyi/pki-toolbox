<script lang="ts">
	/** Renders one decoded X.509 certificate as a sectioned card. */
	import type { Snippet } from 'svelte';
	import type { DecodedCertificate } from '$lib/pki/parse';
	import type { ChainRole } from '$lib/pki/chain';
	import { formatDate, formatSerial, hexWithColons } from '$lib/pki/format';
	import RowList, { type Row } from './RowList.svelte';
	import Badge, { type BadgeTone } from './Badge.svelte';
	import Icon from './Icon.svelte';

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

	const validityNote = $derived(
		cert.validity === 'valid'
			? `expires in ${cert.daysUntilExpiry} day(s)`
			: cert.validity === 'expired'
				? `expired ${Math.abs(cert.daysUntilExpiry)} day(s) ago`
				: 'the start date is in the future'
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
	<header class="flex flex-wrap items-center gap-3 px-5 py-4">
		<span
			class="grid h-9 w-9 shrink-0 place-items-center yk-chip bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
		>
			<Icon name="certificate" size={20} />
		</span>
		<div class="min-w-0 flex-1">
			<p class="truncate font-semibold text-slate-900 dark:text-slate-100" title={commonName}>
				{#if index !== undefined}<span class="text-slate-500">#{index + 1}</span>
				{/if}{commonName}
			</p>
			<p class="text-xs text-slate-500 dark:text-slate-500">{validityNote}</p>
		</div>
		<div class="flex flex-wrap items-center gap-1.5">
			{#if role}<Badge tone={role}>{ROLE_LABEL[role]}</Badge>{/if}
			{#if cert.isCA && !role}<Badge tone="info">CA</Badge>{/if}
			{#if cert.isSelfSigned}<Badge tone="neutral">Self-signed</Badge>{/if}
			<Badge tone={VALIDITY[cert.validity].tone}>{VALIDITY[cert.validity].label}</Badge>
		</div>
	</header>

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
