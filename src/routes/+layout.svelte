<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<!-- `not-sr-only` resets padding to 0, so the revealed link has to restate its
	     own: without `focus:px-4 focus:py-3` it appears 137x20, under the 24px
	     minimum, and it is the very first target a keyboard user meets. -->
	<a
		href="#main"
		class="sr-only rounded-lg bg-teal-500 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-3 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:bg-teal-400 dark:text-[color:var(--yk-on-accent)]"
	>
		Skip to main content
	</a>

	<Navbar />

	<main id="main" tabindex="-1" class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
		{@render children()}
	</main>

	<!-- Footer DA youkyi : filet neutre interrompu par l'entaille oblique orange,
	     le geste signature — frontière entre deux masses, l'un des trois emplois
	     que la charte v2 laisse à la pente.

	     La pente est TENUE, pas dessinée puis étirée : les deux filets sont des
	     éléments souples, l'entaille est un SVG de taille fixe entre eux. Avec un
	     seul SVG en `preserveAspectRatio="none"` la diagonale se couchait avec la
	     fenêtre — ≈4° à 1280px, ≈13° à 390px — et la seule signature dessinée du
	     site l'était donc fausse à toutes les largeurs. Ici dy/dx = 15,3/40 =
	     0,382, soit 1/Φ² ≈ 21°, quelle que soit la largeur. -->
	<footer class="relative text-slate-500 dark:text-slate-400">
		<div
			class="pointer-events-none absolute inset-x-0 top-0 flex items-start text-slate-200 dark:text-slate-800"
			aria-hidden="true"
		>
			<span class="mt-[17.5px] h-px flex-1 bg-current"></span>
			<svg width="40" height="20" viewBox="0 0 40 20" fill="none" class="block shrink-0">
				<line
					x1="0"
					y1="17.5"
					x2="40"
					y2="2.2"
					stroke="var(--yk-accent)"
					stroke-width="2"
					stroke-linecap="square"
				/>
			</svg>
			<span class="mt-[2.2px] h-px flex-1 bg-current"></span>
		</div>
		<div
			class="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 px-4 pt-9 pb-8 sm:px-6 lg:px-8"
		>
			<div class="max-w-[46ch]">
				<a
					href="https://youkyi.fr"
					target="_blank"
					rel="noopener noreferrer"
					class="yk-wordmark inline-flex min-h-11 items-center text-slate-900 hover:text-teal-700 dark:text-slate-100 dark:hover:text-teal-300"
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
						class="inline-flex min-h-11 items-center text-teal-700 hover:underline dark:text-teal-300"
						>youkyi.fr</a
					>
					<a
						href="https://github.com/youkyi/pki-toolbox"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex min-h-11 items-center text-teal-700 hover:underline dark:text-teal-300"
						>github</a
					>
				</span>
				<span>© 2026 · Agasseau Alexandre</span>
			</div>
		</div>
	</footer>
</div>
