<script module lang="ts">
	import type { Asn1Node } from '$lib/pki/asn1';

	/** Tailwind text colour for a given ASN.1 tag. */
	function tagColor(node: Asn1Node): string {
		if (node.tagClass !== 'Universal') return 'text-slate-500 dark:text-slate-400';
		if (node.tag === 'SEQUENCE' || node.tag === 'SET') return 'text-teal-600 dark:text-teal-400';
		if (node.tag === 'OBJECT IDENTIFIER') return 'text-violet-600 dark:text-violet-400';
		if (node.tag === 'INTEGER' || node.tag === 'BOOLEAN' || node.tag === 'ENUMERATED')
			return 'text-amber-600 dark:text-amber-400';
		if (node.tag.endsWith('String') || node.tag.endsWith('Time'))
			return 'text-sky-600 dark:text-sky-400';
		return 'text-slate-600 dark:text-slate-300';
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import Icon from './Icon.svelte';
	import Self from './Asn1Tree.svelte';

	let { node, depth = 0 }: { node: Asn1Node; depth?: number } = $props();

	// Seed the open/closed state from the depth once; it is toggled freely after.
	let open = $state(untrack(() => depth < 6));

	const expandable = $derived(node.constructed && node.children.length > 0);
</script>

<div class="font-mono text-[13px] leading-relaxed">
	<div class="flex items-baseline gap-2">
		{#if expandable}
			<button
				type="button"
				onclick={() => (open = !open)}
				class="flex items-baseline gap-1.5 rounded text-left hover:bg-slate-100 dark:hover:bg-slate-800"
			>
				<Icon
					name="chevron-down"
					size={13}
					class="shrink-0 transition-transform {open ? '' : '-rotate-90'}"
				/>
				<span class="font-semibold {tagColor(node)}">{node.tag}</span>
				<span class="text-xs text-slate-400 dark:text-slate-500">
					{node.children.length} élément{node.children.length > 1 ? 's' : ''}
				</span>
			</button>
		{:else}
			<span class="pl-[18px] font-semibold {tagColor(node)}">{node.tag}</span>
			{#if node.value}
				<span class="break-all text-slate-800 dark:text-slate-200">{node.value}</span>
			{:else if node.tag !== 'NULL'}
				<span class="text-slate-400 dark:text-slate-600">(vide)</span>
			{/if}
		{/if}
		<span class="ml-auto shrink-0 pl-3 text-xs text-slate-400 dark:text-slate-600">
			@{node.offset} · {node.length} o
		</span>
	</div>

	{#if expandable && open}
		<div class="ml-2 border-l border-slate-200 pl-3 dark:border-slate-800">
			{#each node.children as child, i (i)}
				<Self node={child} depth={depth + 1} />
			{/each}
		</div>
	{/if}
</div>
