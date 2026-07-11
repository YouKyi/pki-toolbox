<script lang="ts">
	/** Standard title block shown at the top of every tool page. */
	import type { Tool } from '$lib/tools';
	import Icon from './Icon.svelte';
	import Badge from './Badge.svelte';

	let { tool }: { tool: Tool } = $props();
</script>

<header class="mb-6">
	<div class="flex items-center gap-3">
		<span
			class="grid h-11 w-11 shrink-0 place-items-center yk-chip bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
		>
			<Icon name={tool.icon} size={24} />
		</span>
		<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
			{tool.name}
		</h1>
		{#if tool.status === 'beta'}<Badge tone="beta">Beta</Badge>{/if}
		{#if tool.status === 'planned'}<Badge tone="planned">v2</Badge>{/if}
	</div>
	<p class="mt-2 max-w-2xl text-slate-500 dark:text-slate-400">{tool.description}</p>
</header>
