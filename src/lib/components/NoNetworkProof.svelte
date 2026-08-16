<script lang="ts">
	/**
	 * The privacy claim, at the moment it matters, with the mechanism behind it.
	 *
	 * The sentence used to sit under the action row in the faintest ink on the
	 * page: after the reader had already committed their artefact, and asserting
	 * something they had no way to check. It now sits in the box that receives
	 * the artefact, and it opens onto three things a reader can verify in well
	 * under a minute: the policy this page was served with, read back from the
	 * page itself; the number of requests able to carry data out since they
	 * pasted; and a live attempt that the browser refuses in front of them.
	 */
	import Icon from './Icon.svelte';
	import { connectSrc, network } from '$lib/network.svelte';

	let open = $state(false);
	let directive = $state('');
	let testing = $state(false);
	let verdict = $state<'' | 'blocked' | 'allowed'>('');
	let reported = $state('');

	const panelId = $props.id();

	$effect(() => {
		network.start();
		directive = connectSrc();
	});

	/**
	 * Asks the browser to make the one kind of request that could carry an
	 * artefact away, and reports what happens. The target is this page's own
	 * URL, so a deployment that somehow failed to enforce the policy fetches
	 * the document it already served, with no payload and no third party.
	 */
	async function testPolicy() {
		testing = true;
		verdict = '';
		reported = '';
		const onViolation = (event: SecurityPolicyViolationEvent) => {
			reported = event.effectiveDirective || event.violatedDirective;
		};
		document.addEventListener('securitypolicyviolation', onViolation);
		try {
			await fetch(location.href, { method: 'HEAD', cache: 'no-store' });
			verdict = 'allowed';
		} catch {
			verdict = 'blocked';
		} finally {
			testing = false;
			// The violation event lands on the same task as the rejection; give it
			// one turn before we stop listening for it.
			setTimeout(() => document.removeEventListener('securitypolicyviolation', onViolation), 0);
		}
	}
</script>

<div
	class="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-dashed border-slate-300 px-4 py-2.5 dark:border-slate-700"
>
	<Icon name="lock" size={16} class="shrink-0 text-ink-3" />
	<p class="text-sm text-ink-2">Decoded in this page. Nothing you paste leaves it.</p>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-controls={panelId}
		class="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:text-teal-700 max-sm:min-h-11 dark:text-slate-400 dark:hover:text-teal-400"
	>
		{network.marked ? `Verify: ${network.count} requests` : 'Verify'}
		<Icon name="chevron-down" size={13} class={open ? 'rotate-180 transition' : 'transition'} />
	</button>
</div>

{#if open}
	<div
		id={panelId}
		class="space-y-3 border-b border-dashed border-slate-300 px-4 py-3 dark:border-slate-700"
	>
		{#if directive}
			<p class="text-sm text-ink-2">
				This page was served with a policy the browser enforces on it, whatever its code asks for.
				Read here from the page itself:
			</p>
			<!-- Du code : bloc terminal de la charte, sombre même en page claire. -->
			<pre class="ykterm ykterm__body">{directive}</pre>
			<p class="text-sm text-ink-2">
				<code class="font-mono text-xs">connect-src</code> governs every fetch, XHR, WebSocket and
				beacon. At <code class="font-mono text-xs">'none'</code>, there is nowhere for an artefact
				to go.
			</p>
		{:else}
			<p class="text-sm text-ink-2">
				Nothing in this page's markup, which settles nothing on its own: a policy sent as an HTTP
				header is invisible to the page reading itself, and this one cannot even fetch its own
				headers to look. The build that ships carries the policy in the markup. Here, only the test
				below answers.
			</p>
		{/if}

		<p class="text-sm text-ink-2">
			{#if network.marked}
				<strong class="font-semibold text-ink">{network.count}</strong>
				{network.count === 1 ? 'request' : 'requests'} able to carry data out since you pasted.
			{:else}
				Paste an artefact and this counts what left with it.
			{/if}
		</p>

		{#if network.names.length}
			<ul class="space-y-1 font-mono text-xs break-all text-ink-2">
				{#each network.names as name (name)}
					<li>{name}</li>
				{/each}
			</ul>
		{/if}

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={testPolicy}
				disabled={testing}
				class="yk-pressable inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-surface-2 disabled:opacity-50 max-sm:min-h-11 dark:border-slate-700 dark:text-slate-200"
			>
				<Icon name={testing ? 'clock' : 'globe'} size={14} />
				{testing ? 'Trying…' : 'Try to send something'}
			</button>
			{#if verdict}
				<p
					role="status"
					class="text-xs {verdict === 'blocked' ? 'text-ink-2' : 'text-[color:var(--yk-accent)]'}"
				>
					{#if verdict === 'blocked'}
						Refused by the browser{reported ? `, on ${reported}` : ''}. Nothing left the page.
					{:else}
						The request went through: this deployment is not enforcing the policy.
					{/if}
				</p>
			{/if}
		</div>

		<p class="text-xs text-ink-3">Or check it yourself: open the network tab and decode again.</p>
	</div>
{/if}
