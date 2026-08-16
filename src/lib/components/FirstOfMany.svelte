<script lang="ts">
	/**
	 * Says out loud that the paste carried more than one certificate.
	 *
	 * These tools read the first one, which is the right answer for a server
	 * bundle and a reasonable one for a fullchain, but silence about the other
	 * two lets a reader believe their file held a single certificate. The line
	 * states the count and what is on screen; the carry line underneath already
	 * offers the tool that reads them all.
	 */
	import Icon from './Icon.svelte';
	import { splitBlocks } from '$lib/pki/pem';

	type Props = {
		/** What was decoded, as it was pasted. */
		input: string;
		/** What the tool did with the first one, as a sentence. */
		reading: string;
	};

	let { input, reading }: Props = $props();

	const count = $derived(
		splitBlocks(input).filter((block) => block.type.toUpperCase().endsWith('CERTIFICATE')).length
	);
</script>

{#if count > 1}
	<p class="flex items-start gap-2 text-sm text-ink-2">
		<Icon name="info" size={16} class="mt-0.5 shrink-0 text-ink-3" />
		<span>This paste carries {count} certificates. {reading}</span>
	</p>
{/if}
