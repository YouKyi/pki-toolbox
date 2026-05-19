<script lang="ts">
	/** Navigation panel: brand + tools grouped by category. */
	import { page } from '$app/state';
	import { categories, toolsByCategory } from '$lib/tools';
	import Icon from './Icon.svelte';

	let { onnavigate }: { onnavigate?: () => void } = $props();

	const current = $derived(page.url.pathname);
</script>

<div class="flex h-full flex-col bg-white dark:bg-slate-900">
	<a
		href="/"
		onclick={onnavigate}
		class="flex items-center gap-2.5 border-b border-slate-200 px-4 py-4 dark:border-slate-800"
	>
		<span
			class="grid h-9 w-9 place-items-center rounded-lg bg-teal-600 text-white shadow-sm dark:bg-teal-500"
		>
			<Icon name="shield" size={20} />
		</span>
		<span class="leading-tight">
			<span class="block font-semibold text-slate-900 dark:text-slate-100">pki-toolbox</span>
			<span class="block text-xs text-slate-400 dark:text-slate-500">Décodeur PKI local</span>
		</span>
	</a>

	<nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
		{#each categories as category (category.id)}
			{@const list = toolsByCategory(category.id)}
			{#if list.length}
				<div>
					<p
						class="px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500"
					>
						{category.label}
					</p>
					<ul class="mt-1.5 space-y-0.5">
						{#each list as tool (tool.slug)}
							{@const active = current === `/${tool.slug}`}
							<li>
								<a
									href="/{tool.slug}"
									onclick={onnavigate}
									aria-current={active ? 'page' : undefined}
									class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors {active
										? 'bg-teal-50 font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300'
										: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'} {tool.status ===
									'planned'
										? 'opacity-65'
										: ''}"
								>
									<Icon name={tool.icon} size={18} class="shrink-0" />
									<span class="flex-1 truncate">{tool.name}</span>
									{#if tool.status === 'planned'}
										<span
											class="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500"
											>v2</span
										>
									{:else if tool.status === 'beta'}
										<span
											class="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
											>beta</span
										>
									{/if}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/each}
	</nav>

	<div class="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
		<p class="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
			<Icon name="lock" size={13} /> 100 % côté client, rien n'est envoyé.
		</p>
	</div>
</div>
