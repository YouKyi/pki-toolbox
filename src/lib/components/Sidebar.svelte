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
		class="flex h-16 items-center gap-2.5 border-b border-slate-200 px-4 dark:border-slate-800"
	>
		<span
			class="yk-chip grid h-9 w-9 place-items-center bg-slate-900 text-[color:var(--yk-accent)] dark:bg-slate-800"
		>
			<Icon name="shield" size={20} />
		</span>
		<span class="leading-tight">
			<span class="yk-wordmark block text-[15px] text-slate-900 dark:text-slate-100"
				>pki-toolbox<u>_</u></span
			>
			<span class="yk-kicker block text-slate-500 dark:text-slate-500">by youkyi</span>
		</span>
	</a>

	<nav aria-label="Tools" class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
		{#each categories as category (category.id)}
			{@const list = toolsByCategory(category.id)}
			{#if list.length}
				<div>
					<p id="cat-{category.id}" class="yk-kicker px-2 text-slate-500 dark:text-slate-500">
						{category.label}
					</p>
					<ul aria-labelledby="cat-{category.id}" class="mt-1.5 space-y-0.5">
						{#each list as tool (tool.slug)}
							{@const active = current === `/${tool.slug}`}
							<li>
								<a
									href="/{tool.slug}"
									onclick={onnavigate}
									aria-current={active ? 'page' : undefined}
									class="flex items-center gap-2.5 border-l-2 px-2.5 py-2 text-sm transition-colors {active
										? 'border-[color:var(--yk-accent)] bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100'
										: 'border-transparent text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'} {tool.status ===
									'planned'
										? 'opacity-65'
										: ''}"
								>
									<Icon name={tool.icon} size={18} class="shrink-0" />
									<span class="flex-1 truncate">{tool.name}</span>
									{#if tool.status === 'planned'}
										<span
											class="yk-cut-sm bg-slate-100 px-1 font-mono text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-500"
											>soon</span
										>
									{:else if tool.status === 'beta'}
										<span
											class="yk-cut-sm bg-amber-100 px-1 font-mono text-[10px] font-medium text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
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
		<p class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500">
			<Icon name="lock" size={13} /> 100% client-side, nothing is sent.
		</p>
	</div>
</div>
