<script lang="ts">
	/**
	 * The answer layer of a result card.
	 *
	 * Every decoder is opened with one question in mind — when does this expire,
	 * is this CRL still current, what is in this keystore — and the detail rows
	 * answer it only after a scroll. This band answers it first: the artefact
	 * names itself as a heading, then one line of ink carries the answer, then a
	 * muted line carries the context. It sits one plane above the card, so the
	 * eye lands on it without a second accent colour doing the work.
	 *
	 * Dates are always ABSOLUTE. A relative count ("in 3,214 days") is context
	 * and rides in the parentheses; nobody plans against a day counter.
	 */
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	type Props = {
		icon: string;
		/** What the artefact is called. Becomes the card's heading. */
		title: string;
		/** Position in a list (chain link, bundle entry), rendered before the title. */
		index?: number;
		/** Label opening the answer line, e.g. "Expires", "Next update". */
		lead?: string;
		/** The answer itself, set in mono: a date, a count, an algorithm. */
		value?: string;
		/** ISO timestamp when `value` is a date, so the answer stays machine-readable. */
		datetime?: string;
		/** Context for the answer, shown in parentheses. */
		note?: string;
		/** Secondary line: provenance, coverage, contents. */
		meta?: string;
		/** Status badges, pinned to the right of the band. */
		badges?: Snippet;
	};

	let { icon, title, index, lead, value, datetime, note, meta, badges }: Props = $props();
</script>

<header class="border-b border-slate-200 bg-surface-2 px-5 py-5 dark:border-slate-800">
	<div class="flex flex-wrap items-start gap-3">
		<span
			class="yk-chip grid h-9 w-9 shrink-0 place-items-center bg-slate-200 text-ink-2 dark:bg-slate-700"
		>
			<Icon name={icon} size={20} />
		</span>
		<!-- A floor (not min-w-0) so the title block cannot be squeezed to a few
		     pixels by the badges: below it, the wrapping header drops the badges to
		     their own line instead. -->
		<div class="min-w-[10rem] flex-1">
			<h2
				class="font-head text-xl leading-tight font-bold tracking-tight [overflow-wrap:anywhere] text-ink"
			>
				<!-- The separator lives inside the span: a newline between the index and
				     the title is trimmed, which would print "#1demo.example.test". -->
				{#if index !== undefined}<span class="text-ink-3">#{index + 1}&nbsp;</span>{/if}{title}
			</h2>
			{#if value}
				<!-- Parentheses rather than a separator: when the line wraps on a phone,
				     a leading middot reads as a stray bullet. -->
				<p class="mt-2 text-[15px] text-ink">
					{#if lead}{lead}{/if}
					{#if datetime}<time {datetime} class="font-mono">{value}</time>{:else}<span
							class="font-mono">{value}</span
						>{/if}
					{#if note}<span class="text-ink-3">({note})</span>{/if}
				</p>
			{/if}
			{#if meta}
				<p class="mt-1 text-sm text-ink-3">{meta}</p>
			{/if}
		</div>
		{#if badges}
			<div class="flex flex-wrap items-center gap-1.5">{@render badges()}</div>
		{/if}
	</div>
</header>
