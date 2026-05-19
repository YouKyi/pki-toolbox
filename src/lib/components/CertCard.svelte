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
		leaf: 'Certificat feuille',
		intermediate: 'CA intermédiaire',
		root: 'CA racine'
	};

	const VALIDITY: Record<DecodedCertificate['validity'], { tone: BadgeTone; label: string }> = {
		valid: { tone: 'valid', label: 'Valide' },
		expired: { tone: 'expired', label: 'Expiré' },
		'not-yet-valid': { tone: 'pending', label: 'Pas encore valide' }
	};

	const commonName = $derived(
		cert.subjectParts.find((p) => p.key === 'CN')?.value ?? cert.subject ?? '(sans sujet)'
	);

	const validityNote = $derived(
		cert.validity === 'valid'
			? `expire dans ${cert.daysUntilExpiry} jour(s)`
			: cert.validity === 'expired'
				? `expiré depuis ${Math.abs(cert.daysUntilExpiry)} jour(s)`
				: 'la date de début est dans le futur'
	);

	const identity: Row[] = $derived([
		{ label: 'Sujet', value: cert.subject || '—', mono: true },
		{ label: 'Émetteur', value: cert.issuer || '—', mono: true },
		{ label: 'Numéro de série', value: formatSerial(cert.serialNumber), mono: true, copy: true }
	]);

	const keyRows: Row[] = $derived([
		{ label: 'Clé publique', value: cert.publicKey.label },
		{ label: 'Algorithme de signature', value: cert.signatureAlgorithm },
		{ label: 'Autorité de certification', value: cert.isCA ? 'Oui' : 'Non' },
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
			class="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500"
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
			class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
		>
			<Icon name="certificate" size={20} />
		</span>
		<div class="min-w-0 flex-1">
			<p class="truncate font-semibold text-slate-900 dark:text-slate-100" title={commonName}>
				{#if index !== undefined}<span class="text-slate-400">#{index + 1}</span>
				{/if}{commonName}
			</p>
			<p class="text-xs text-slate-400 dark:text-slate-500">{validityNote}</p>
		</div>
		<div class="flex flex-wrap items-center gap-1.5">
			{#if role}<Badge tone={role}>{ROLE_LABEL[role]}</Badge>{/if}
			{#if cert.isCA && !role}<Badge tone="info">CA</Badge>{/if}
			{#if cert.isSelfSigned}<Badge tone="neutral">Auto-signé</Badge>{/if}
			<Badge tone={VALIDITY[cert.validity].tone}>{VALIDITY[cert.validity].label}</Badge>
		</div>
	</header>

	{#snippet identityBody()}<RowList rows={identity} />{/snippet}
	{@render section('Identité', identityBody)}

	{#snippet validityBody()}
		<RowList
			rows={[
				{ label: 'Valide à partir du', value: formatDate(cert.notBefore), mono: true },
				{ label: "Valide jusqu'au", value: formatDate(cert.notAfter), mono: true }
			]}
		/>
	{/snippet}
	{@render section('Validité', validityBody)}

	{#snippet keyBody()}<RowList rows={keyRows} />{/snippet}
	{@render section('Clé & signature', keyBody)}

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
							Extensions présentes
						</p>
						{@render chips(
							cert.extensions.map((e) => (e.critical ? `${e.name} (critique)` : e.name)),
							'neutral'
						)}
					</div>
				{/if}
			</div>
		{/snippet}
		{@render section('Extensions', extBody)}
	{/if}

	{#snippet fpBody()}<RowList rows={fingerprints} />{/snippet}
	{@render section('Empreintes (DER)', fpBody)}
</article>
