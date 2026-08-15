<script module lang="ts">
	export type Row = {
		label: string;
		value: string;
		/** Render the value in a monospace font (hex, DNs, …). */
		mono?: boolean;
		/** Show a copy-to-clipboard button next to the value. */
		copy?: boolean;
	};
</script>

<script lang="ts">
	import Icon from './Icon.svelte';

	let { rows }: { rows: Row[] } = $props();

	let copied = $state<string | null>(null);

	async function copyValue(row: Row) {
		try {
			await navigator.clipboard.writeText(row.value);
			copied = row.label;
			setTimeout(() => {
				if (copied === row.label) copied = null;
			}, 1200);
		} catch {
			/* clipboard unavailable, nothing to do */
		}
	}
</script>

<dl class="divide-y divide-slate-200 dark:divide-slate-800">
	{#each rows as row (row.label)}
		<!-- minmax(0,1fr) + min-w-0: a `1fr` track and a grid/flex item both default
		     to min-width:auto, so a long unbroken value (hex fingerprint, DN, serial)
		     cannot shrink and gets clipped on narrow screens.
		     `overflow-wrap: anywhere` (not `break-word`, which does not shrink
		     min-content, and not `break-all`, which would split "CN=" mid-token)
		     lets a value break at its spaces and commas first, and only inside a
		     token when there is no other choice — e.g. a colon-delimited hash. -->
		<div class="grid gap-1 py-2.5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
			<dt class="text-sm font-medium text-slate-500 dark:text-slate-400">{row.label}</dt>
			<dd class="flex min-w-0 items-start gap-2 text-sm text-slate-900 dark:text-slate-100">
				<!-- `leading-5` is what makes the rhythm a decision instead of an accident:
				     without it the line box follows the font metrics — 18.57px for the
				     13px mono, 20px for the 14px sans — so a row's height depended on
				     which face its value happened to use, and sub-pixel rounding pushed
				     some to 41px and others to 40px. Every single-line row is now 40px,
				     with or without a copy button, and a wrapping value grows by whole
				     20px steps. -->
				<span
					class="min-w-0 leading-5 [overflow-wrap:anywhere] {row.mono
						? 'font-mono text-[13px]'
						: ''}">{row.value}</span
				>
				{#if row.copy && row.value}
					<!-- The 44px hit box is bled into the row's own padding with a negative
					     margin: without it the button is a 44px flex item next to a 20px
					     line, so it both pushes the row 23px taller than its neighbours and
					     drops the glyph 12px below the value it copies. The outer size ends
					     up equal to the line height, so a row with a copy button is exactly
					     as tall as one without. -->
					<!-- Two boxes, on purpose: the button carries the 44px hit area, bled
					     into the row's padding so it does not change the rhythm, and the
					     inner span carries everything that is PAINTED. Hovering a 44px
					     square would tint a surface that reaches into the rows above and
					     below — the thumb needs the room, the eye must not see it. -->
					<button
						type="button"
						onclick={() => copyValue(row)}
						class="yk-hit group/copy -my-3 shrink-0 text-slate-500"
						aria-label="Copy {row.label}"
						title="Copy"
					>
						<span
							class="grid place-items-center rounded-md p-1 transition group-hover/copy:bg-slate-100 group-hover/copy:text-teal-700 dark:group-hover/copy:bg-slate-800 dark:group-hover/copy:text-teal-400"
						>
							<Icon name={copied === row.label ? 'check' : 'copy'} size={15} />
						</span>
					</button>
				{/if}
			</dd>
		</div>
	{/each}
</dl>
