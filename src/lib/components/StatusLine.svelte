<script lang="ts">
	/**
	 * One short sentence announcing what just happened, for assistive technology
	 * only.
	 *
	 * The result itself used to be the live region: a successful decode queued
	 * some forty rows, three colon-delimited fingerprints included, read group by
	 * group with no way to interrupt. A live region is for the *news*, not for the
	 * document. The reader reaches the detail by walking into the result, which
	 * already takes focus, and does so at their own pace.
	 */
	let { message }: { message: string } = $props();
</script>

<p class="sr-only" role="status" aria-live="polite">{message}</p>
