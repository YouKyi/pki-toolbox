<script lang="ts">
	/**
	 * A decode failure, led by what the reader can do about it.
	 *
	 * Every tool used to render the raw `Error.message` thrown by the PKI layer
	 * and stop there, so pasting a CRL into the certificate decoder produced a
	 * sentence about a certificate the reader never claimed to have. The parsing
	 * layer knew what the artefact was all along. The message stays, because it
	 * is the truth about what failed, but it now sits under the sentence that
	 * says where to go.
	 */
	import Alert from './Alert.svelte';
	import RouteSuggestion from './RouteSuggestion.svelte';
	import { detectArtefact } from '$lib/pki/detect';

	type Props = {
		id?: string;
		title: string;
		message: string;
		/** What was in the box when it failed, so the artefact can be identified. */
		input: string;
		/** The slug of the tool showing this, so it never suggests itself. */
		current: string;
	};

	let { id, title, message, input, current }: Props = $props();

	const detected = $derived(detectArtefact(input));
	/**
	 * True only when there is something to say beyond the failure itself. A
	 * corrupt certificate on the certificate decoder is detected and has nowhere
	 * better to go, and demoting the only message on screen to a footnote would
	 * make the page say less than before.
	 */
	const leads = $derived(
		Boolean(detected && (detected.slug === null || detected.slug !== current))
	);
</script>

<Alert {id} variant="error" {title}>
	{#if detected && leads}
		<RouteSuggestion {detected} artefact={input} {current} />
		<p class="mt-2 text-xs text-ink-3">{message}</p>
	{:else}
		<p>{message}</p>
	{/if}
</Alert>
