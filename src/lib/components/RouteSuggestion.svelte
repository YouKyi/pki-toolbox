<script lang="ts">
	/**
	 * Names what the artefact actually is, and offers the tool that reads it.
	 *
	 * The artefact travels in memory, never in the URL: a PKI artefact in a
	 * query string is an artefact in a history file, in a proxy log and in a
	 * bookmark sync, which is the opposite of what this product sells.
	 */
	import { goto } from '$app/navigation';
	import Icon from './Icon.svelte';
	import type { Detected } from '$lib/pki/detect';
	import { toolBySlug } from '$lib/tools';
	import { carry } from '$lib/handoff';

	type Props = {
		detected: Detected;
		/** What to hand the other tool. */
		artefact: string;
		/** The slug of the tool showing this, so it never suggests itself. */
		current?: string;
	};

	let { detected, artefact, current }: Props = $props();

	const elsewhere = $derived(
		detected.slug && detected.slug !== current ? toolBySlug(detected.slug) : undefined
	);

	function open() {
		if (!elsewhere) return;
		carry(artefact);
		goto(`/${elsewhere.slug}`);
	}
</script>

{#if elsewhere}
	<p>This looks like {detected.label}, which the {elsewhere.name} reads.</p>
	<button
		type="button"
		onclick={open}
		class="yk-pressable mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-surface-2 max-sm:min-h-11 dark:border-slate-700 dark:text-slate-200"
	>
		<Icon name={elsewhere.icon} size={14} />
		Open it there
	</button>
	<p class="mt-2 text-xs text-ink-3">It travels with you in memory, never in the URL.</p>
{:else if detected.slug === null}
	<p>That is {detected.label}. Nothing here needs it, and nothing left this page.</p>
{/if}
