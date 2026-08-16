<script lang="ts">
	import { goto } from '$app/navigation';
	import { categories, toolsByCategory } from '$lib/tools';
	import { detectArtefact } from '$lib/pki/detect';
	import { carry } from '$lib/handoff';
	import { ISRG_ROOT_X1 } from '$lib/samples';
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import StatusLine from '$lib/components/StatusLine.svelte';

	/**
	 * The page used to be a directory: eleven equal cards and no admission that
	 * the visitor arrives with an artefact already on the clipboard. It leads
	 * with the box now, and the grid stays underneath as the browse path.
	 *
	 * Nothing is decoded here. The page reads the label, hands the artefact to
	 * the tool that owns it, and gets out of the way.
	 */
	let input = $state('');
	let unknown = $state(false);

	const detected = $derived(detectArtefact(input));
	/**
	 * A private key has no tool here, and the box already covers it and says so.
	 * The action is held back rather than answered with a second notice.
	 */
	const noTool = $derived(Boolean(detected) && detected?.slug === null);

	const status = $derived(
		unknown
			? 'Nothing recognisable in what you pasted'
			: noTool
				? `Detected: ${detected?.label}, which no tool here reads`
				: ''
	);

	function route() {
		unknown = false;
		if (!detected) {
			unknown = true;
			return;
		}
		if (!detected.slug) return;
		carry(input);
		goto(`/${detected.slug}`);
	}
</script>

<svelte:head>
	<title>PKI-Toolbox, self-hosted PKI decoder</title>
</svelte:head>

<!-- Seuil : le semis à la pente 1/Φ² marque la bascule du chrome vers le
     contenu. Localisé et fondu, jamais un fond plein (DA v2). -->
<section class="yk-semis relative mb-6">
	<!-- The heading used to read "PKI toolbox", restating the wordmark sitting 40px
	     above it: the largest type on the page for no information. It carries the
	     promise now, and the claim that used to sit above it as an eyebrow is part
	     of the sentence that follows, where it is read rather than decorated. -->
	<h1 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
		Decode a certificate without uploading it
	</h1>
	<p class="mt-3 max-w-2xl text-ink-2">
		X.509 certificates, signing requests, chains, revocation lists, keystores and raw ASN.1, read in
		your browser, on your machine. Nothing you paste leaves the page.
	</p>
</section>

<!-- The entry point: paste, and the artefact names the tool it belongs to. -->
<section class="mb-10">
	<PemInput
		bind:value={input}
		ondecode={route}
		neverFolds
		compact
		decodeDisabled={noTool}
		decodeLabel="Open the right tool"
		example={ISRG_ROOT_X1}
		placeholder="Paste any PKI artefact here, or drop a file. It goes to the tool that reads it."
	/>

	<div class="mt-3 space-y-3">
		<StatusLine message={status} />
		{#if unknown}
			<Alert variant="error" title="Nothing recognisable in there">
				<p>
					A PKI artefact is armoured text (<code class="font-mono text-xs">-----BEGIN …-----</code>)
					or base64-encoded DER. Paste one of those, drop a file, or pick a tool below.
				</p>
			</Alert>
		{/if}
	</div>
</section>

{#each categories as category (category.id)}
	{@const list = toolsByCategory(category.id)}
	{#if list.length}
		<section class="mb-8">
			<!-- The label carried the page's structure in its faintest ink. It keeps
			     the charter's mono kicker and takes the secondary step, with a
			     hairline running out of it so the section reads as a boundary. -->
			<div class="mb-3 flex items-center gap-3">
				<h2 class="yk-kicker text-ink-2">{category.label}</h2>
				<span class="h-px flex-1 bg-line"></span>
			</div>
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each list as tool, i (tool.slug)}
					<!-- The certificate decoder is roughly four visits in five. In a grid
					     of equals it had the weight of the CRL decoder; it takes the full
					     row now, which is the only primacy this page needs to state. -->
					<a
						href="/{tool.slug}"
						class="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-600 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 {category.id ===
							'decode' && i === 0
							? 'sm:col-span-2 xl:col-span-3'
							: ''} {tool.status === 'planned' ? 'opacity-75' : ''}"
					>
						<div class="flex items-center gap-3">
							<span
								class="yk-chip grid h-10 w-10 shrink-0 place-items-center bg-surface-2 text-slate-600 transition group-hover:bg-slate-200 dark:text-slate-300 dark:group-hover:bg-slate-700"
							>
								<Icon name={tool.icon} size={20} />
							</span>
							<span class="font-semibold text-slate-900 dark:text-slate-100">{tool.name}</span>
							<span class="ml-auto">
								{#if tool.status === 'beta'}
									<Badge tone="beta">Beta</Badge>
								{:else if tool.status === 'planned'}
									<Badge tone="planned">Coming soon</Badge>
								{/if}
							</span>
						</div>
						<p class="mt-2.5 text-sm text-slate-500 dark:text-slate-400">{tool.description}</p>
					</a>
				{/each}
			</div>
		</section>
	{/if}
{/each}
