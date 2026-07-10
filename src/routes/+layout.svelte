<script lang="ts">
	import '../app.css';
	import { onMount, tick } from 'svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { initTheme, toggleTheme, theme } from '$lib/theme.svelte';

	let { children } = $props();
	let drawerOpen = $state(false);

	let drawerEl: HTMLElement | undefined = $state();
	let menuButton: HTMLButtonElement | undefined = $state();

	onMount(initTheme);

	/** Dynamic accessible name for the theme toggle (states the action). */
	const themeAction = $derived(
		theme.value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
	);

	function openDrawer() {
		drawerOpen = true;
	}

	function closeDrawer() {
		drawerOpen = false;
		menuButton?.focus();
	}

	/** Collect the focusable elements currently inside a container. */
	function focusables(root: HTMLElement): HTMLElement[] {
		return Array.from(
			root.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		);
	}

	/**
	 * Svelte action applied to the open drawer: moves focus inside on mount,
	 * traps Tab/Shift+Tab within the drawer, and closes on Escape.
	 */
	function modalDrawer(node: HTMLElement) {
		function onKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				event.preventDefault();
				closeDrawer();
				return;
			}
			if (event.key !== 'Tab') return;
			const items = focusables(node);
			if (items.length === 0) {
				event.preventDefault();
				return;
			}
			const first = items[0];
			const last = items[items.length - 1];
			const active = document.activeElement as HTMLElement | null;
			if (event.shiftKey && active === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && active === last) {
				event.preventDefault();
				first.focus();
			}
		}

		node.addEventListener('keydown', onKeydown);
		tick().then(() => focusables(node)[0]?.focus());

		return {
			destroy() {
				node.removeEventListener('keydown', onKeydown);
			}
		};
	}
</script>

<div class="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
	<a
		href="#main"
		class="sr-only rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:outline-2 focus:outline-offset-2 focus:outline-teal-700"
	>
		Skip to main content
	</a>

	<!-- Desktop sidebar: the column carries the border and stretches to the full
	     grid-row height, so its right border and footer stay level with the main
	     column on pages taller than the viewport. A sticky, viewport-tall inner
	     wrapper keeps the navigation pinned while scrolling. (see MR !122 / #6) -->
	<aside class="hidden border-r border-slate-200 lg:block dark:border-slate-800">
		<div class="sticky top-0 flex h-screen flex-col">
			<Sidebar />
		</div>
	</aside>

	<!-- Mobile drawer -->
	{#if drawerOpen}
		<button
			type="button"
			aria-label="Close menu"
			class="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
			onclick={closeDrawer}
		></button>
		<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
		<aside
			bind:this={drawerEl}
			use:modalDrawer
			role="dialog"
			aria-modal="true"
			aria-label="Navigation menu"
			class="fixed inset-y-0 left-0 z-50 w-64 shadow-xl lg:hidden"
		>
			<Sidebar onnavigate={closeDrawer} />
		</aside>
	{/if}

	<div class="flex min-w-0 flex-col" inert={drawerOpen}>
		<header
			class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85"
		>
			<button
				type="button"
				bind:this={menuButton}
				onclick={openDrawer}
				class="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
				aria-label="Open menu"
			>
				<Icon name="menu" size={22} />
			</button>

			<a
				href="/"
				class="yk-wordmark flex items-center gap-2 text-[15px] text-slate-900 lg:hidden dark:text-slate-100"
			>
				<Icon name="shield" size={18} class="text-teal-600 dark:text-teal-400" /> pki-toolbox<u
					class="-ml-2">_</u
				>
			</a>

			<div class="ml-auto flex items-center gap-1">
				<button
					type="button"
					onclick={toggleTheme}
					class="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
					aria-label={themeAction}
					title={themeAction}
				>
					<Icon name={theme.value === 'dark' ? 'sun' : 'moon'} size={19} />
				</button>
			</div>
		</header>

		<main id="main" tabindex="-1" class="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
			{@render children()}
		</main>

		<!-- Footer DA youkyi (condensé) : filet neutre interrompu par une entaille
		     oblique orange (le geste signature), baseline, mentions légales en mono. -->
		<footer class="relative px-4 pt-9 pb-8 text-slate-500 sm:px-6 dark:text-slate-400">
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
			<div class="flex flex-wrap items-end justify-between gap-4">
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
					<a
						href="https://youkyi.fr"
						target="_blank"
						rel="noopener noreferrer"
						class="text-teal-700 hover:underline dark:text-teal-300">youkyi.fr</a
					>
					<span>© 2026 · Agasseau Alexandre EI</span>
				</div>
			</div>
		</footer>
	</div>
</div>
