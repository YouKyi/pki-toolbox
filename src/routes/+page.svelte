<script lang="ts">
	import { categories, toolsByCategory } from '$lib/tools';
	import Icon from '$lib/components/Icon.svelte';
	import Badge from '$lib/components/Badge.svelte';

	const readyCount = $derived(
		categories.flatMap((c) => toolsByCategory(c.id)).filter((t) => t.status === 'ready').length
	);
</script>

<svelte:head>
	<title>pki-toolbox — décodeur PKI self-hosted</title>
</svelte:head>

<section class="mb-10">
	<div
		class="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
	>
		<Icon name="lock" size={13} /> 100 % côté client — aucune donnée envoyée
	</div>
	<h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
		Boîte à outils PKI
	</h1>
	<p class="mt-3 max-w-2xl text-slate-500 dark:text-slate-400">
		Décodez et inspectez vos artefacts PKI — certificats X.509, CSR, chaînes et empreintes —
		directement dans le navigateur. {readyCount} outils sont disponibles aujourd'hui.
	</p>
</section>

{#each categories as category (category.id)}
	{@const list = toolsByCategory(category.id)}
	{#if list.length}
		<section class="mb-8">
			<h2
				class="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500"
			>
				{category.label}
			</h2>
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each list as tool (tool.slug)}
					<a
						href="/{tool.slug}"
						class="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-500/60 {tool.status ===
						'planned'
							? 'opacity-75'
							: ''}"
					>
						<div class="flex items-center gap-3">
							<span
								class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600 transition group-hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:group-hover:bg-teal-500/20"
							>
								<Icon name={tool.icon} size={20} />
							</span>
							<span class="font-semibold text-slate-900 dark:text-slate-100">{tool.name}</span>
							<span class="ml-auto">
								{#if tool.status === 'ready'}
									<Badge tone="ready">Disponible</Badge>
								{:else if tool.status === 'beta'}
									<Badge tone="beta">Beta</Badge>
								{:else}
									<Badge tone="planned">v2</Badge>
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
