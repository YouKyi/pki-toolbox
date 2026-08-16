<script lang="ts">
	import { categories, toolsByCategory } from '$lib/tools';
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';
</script>

<svelte:head>
	<title>PKI-Toolbox, self-hosted PKI decoder</title>
</svelte:head>

<!-- Seuil : le semis à la pente 1/Φ² marque la bascule du chrome vers le
     contenu. Localisé et fondu, jamais un fond plein (DA v2). -->
<section class="yk-semis relative mb-10">
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

{#each categories as category (category.id)}
	{@const list = toolsByCategory(category.id)}
	{#if list.length}
		<section class="mb-8">
			<h2 class="yk-kicker mb-3 text-ink-3">
				{category.label}
			</h2>
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each list as tool (tool.slug)}
					<a
						href="/{tool.slug}"
						class="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-600 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-400 {tool.status ===
						'planned'
							? 'opacity-75'
							: ''}"
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
