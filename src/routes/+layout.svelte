<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<a
		href="#main"
		class="sr-only bg-teal-700 px-4 py-2 text-sm font-semibold text-white dark:bg-teal-400 dark:text-[color:var(--yk-on-accent)] focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:outline-2 focus:outline-offset-2 focus:outline-teal-700"
	>
		Skip to main content
	</a>

	<Navbar />

	<main id="main" tabindex="-1" class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
		{@render children()}
	</main>

	<!-- Footer DA youkyi (condensé) : filet neutre interrompu par une entaille
	     oblique orange (le geste signature), baseline, mentions légales en mono. -->
	<footer class="relative text-slate-500 dark:text-slate-400">
		<svg
			class="pointer-events-none absolute top-0 left-0 block text-slate-200 dark:text-slate-800"
			viewBox="0 0 1200 8"
			width="100%"
			height="8"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<line
				x1="0"
				y1="4"
				x2="470"
				y2="4"
				stroke="currentColor"
				stroke-width="1"
				vector-effect="non-scaling-stroke"
			/>
			<line
				x1="470"
				y1="4"
				x2="510"
				y2="1"
				stroke="var(--yk-accent)"
				stroke-width="2"
				vector-effect="non-scaling-stroke"
			/>
			<line
				x1="510"
				y1="1"
				x2="1200"
				y2="1"
				stroke="currentColor"
				stroke-width="1"
				vector-effect="non-scaling-stroke"
			/>
		</svg>
		<div
			class="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 px-4 pt-9 pb-8 sm:px-6 lg:px-8"
		>
			<div class="max-w-[46ch]">
				<a
					href="https://youkyi.fr"
					target="_blank"
					rel="noopener noreferrer"
					class="yk-wordmark text-slate-900 hover:text-teal-700 dark:text-slate-100 dark:hover:text-teal-300"
					>youkyi<u>_</u></a
				>
				<p class="mt-2 text-xs">
					PKI-Toolbox, a self-hosted PKI decoder. 100% client-side, no data ever leaves your
					browser.
				</p>
			</div>
			<div class="yk-kicker flex flex-col items-start gap-1.5 sm:items-end">
				<span class="flex items-center gap-3">
					<a
						href="https://youkyi.fr"
						target="_blank"
						rel="noopener noreferrer"
						class="text-teal-700 hover:underline dark:text-teal-300">youkyi.fr</a
					>
					<a
						href="https://github.com/youkyi/pki-toolbox"
						target="_blank"
						rel="noopener noreferrer"
						class="text-teal-700 hover:underline dark:text-teal-300">github</a
					>
				</span>
				<span>© 2026 · Agasseau Alexandre</span>
			</div>
		</div>
	</footer>
</div>
