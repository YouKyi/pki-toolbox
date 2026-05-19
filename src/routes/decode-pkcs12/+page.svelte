<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { decodePkcs12, type DecodedPkcs12 } from '$lib/pki/pkcs12';
	import { TEST_PKCS12, TEST_PKCS12_PASSWORD } from '$lib/samples';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import CertCard from '$lib/components/CertCard.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const tool = requireTool('decode-pkcs12');

	let input = $state('');
	let password = $state('');
	let result = $state<DecodedPkcs12 | null>(null);
	let error = $state('');
	let loading = $state(false);

	async function decode() {
		loading = true;
		error = '';
		result = null;
		try {
			result = await decodePkcs12(input.trim(), password);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	function loadExample() {
		input = TEST_PKCS12;
		password = TEST_PKCS12_PASSWORD;
	}
</script>

<svelte:head><title>{tool.name}, pki-toolbox</title></svelte:head>

<ToolHeader {tool} />

<div class="mb-3 flex flex-wrap items-end gap-3">
	<label class="flex flex-col gap-1 text-sm">
		<span class="font-medium text-slate-600 dark:text-slate-300">Mot de passe du fichier</span>
		<input
			type="password"
			bind:value={password}
			autocomplete="off"
			placeholder="mot de passe…"
			class="w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500/40 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
		/>
	</label>
	<button
		type="button"
		onclick={loadExample}
		class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
	>
		<Icon name="file-text" size={16} /> Charger un exemple
	</button>
</div>

<PemInput
	bind:value={input}
	{loading}
	ondecode={decode}
	decodeLabel="Déchiffrer"
	derLabel="PKCS12"
	placeholder="Importez un fichier .p12 / .pfx, ou collez son contenu base64…"
/>

<div class="mt-6 space-y-4">
	{#if error}
		<Alert variant="error" title="Échec du déchiffrement">{error}</Alert>
	{/if}

	{#if result}
		<Alert variant={result.integrityVerified ? 'success' : 'warn'}>
			{#if result.integrityVerified}
				Intégrité MAC vérifiée, mot de passe correct. {result.certificateCount} certificat(s) et {result.keyCount}
				clé(s) privée(s).
			{:else}
				Contenu déchiffré (ce fichier ne comporte pas de MAC d'intégrité).
			{/if}
		</Alert>

		{#if result.keys.length}
			<div
				class="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
			>
				<h3
					class="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500"
				>
					Clés privées
				</h3>
				<ul class="space-y-2">
					{#each result.keys as key, i (i)}
						<li class="flex flex-wrap items-center gap-2 text-sm">
							<Icon name="lock" size={16} class="text-slate-400" />
							<span class="font-medium text-slate-800 dark:text-slate-200">
								{key.friendlyName ?? '(sans nom)'}
							</span>
							{#if key.algorithm}<Badge tone="info">{key.algorithm}</Badge>{/if}
							{#if key.encrypted}<Badge tone="neutral">chiffrée</Badge>{/if}
						</li>
					{/each}
				</ul>
				<p class="mt-2 text-xs text-slate-400 dark:text-slate-500">
					Le matériel des clés privées n'est jamais affiché.
				</p>
			</div>
		{/if}

		{#each result.certificates as cert, i (i)}
			<CertCard {cert} index={i} />
		{/each}
	{/if}
</div>
