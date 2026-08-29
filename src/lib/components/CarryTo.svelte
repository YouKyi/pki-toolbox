<script lang="ts">
	/**
	 * One artefact, several questions.
	 *
	 * Decode a certificate, then want its ASN.1 tree or its SHA-256 alone: the
	 * answer used to be re-pasting the same PEM by hand into two more tools.
	 * The artefact travels in memory instead, never in the URL, which is the
	 * only form the product's own constraints allow.
	 *
	 * The list comes from what the artefact IS, not from where the reader
	 * happens to be, so a CRL is never offered a tool that decodes
	 * certificates.
	 */
	import { goto } from '$app/navigation';
	import { detectArtefact, RELATED, stripPrivateKeyBlocks } from '$lib/pki/detect';
	import { toolBySlug, type Tool } from '$lib/tools';
	import { carry } from '$lib/handoff';

	type Props = {
		/** What was decoded, as the next tool would receive it. */
		artefact: string;
		/** The slug of the tool showing this, so it never offers itself. */
		current: string;
	};

	let { artefact, current }: Props = $props();
	const carriedArtefact = $derived(stripPrivateKeyBlocks(artefact));

	const others = $derived.by(() => {
		const detected = detectArtefact(carriedArtefact);
		if (!detected) return [] as Tool[];
		return RELATED[detected.kind]
			.filter((slug) => slug !== current)
			.map(toolBySlug)
			.filter((tool): tool is Tool => Boolean(tool));
	});

	function open(tool: Tool) {
		carry(carriedArtefact);
		goto(`/${tool.slug}`);
	}
</script>

{#if others.length}
	<p class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-ink-3">
		<span>Same artefact in</span>
		{#each others as tool (tool.slug)}
			<button
				type="button"
				onclick={() => open(tool)}
				class="rounded font-medium text-slate-500 underline underline-offset-2 transition hover:text-teal-700 max-sm:min-h-11 dark:text-slate-400 dark:hover:text-teal-400"
			>
				{tool.name}
			</button>
		{/each}
	</p>
{/if}
