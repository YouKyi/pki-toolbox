<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { initTheme, toggleTheme, theme } from '$lib/theme.svelte';

	let { children } = $props();
	let drawerOpen = $state(false);

	onMount(initTheme);
</script>

<div class="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
	<!-- Desktop sidebar -->
	<aside
		class="sticky top-0 hidden h-screen border-r border-slate-200 lg:block dark:border-slate-800"
	>
		<Sidebar />
	</aside>

	<!-- Mobile drawer -->
	{#if drawerOpen}
		<button
			type="button"
			aria-label="Close menu"
			class="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
			onclick={() => (drawerOpen = false)}
		></button>
		<aside class="fixed inset-y-0 left-0 z-50 w-64 shadow-xl lg:hidden">
			<Sidebar onnavigate={() => (drawerOpen = false)} />
		</aside>
	{/if}

	<div class="flex min-w-0 flex-col">
		<header
			class="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85"
		>
			<button
				type="button"
				onclick={() => (drawerOpen = true)}
				class="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
				aria-label="Open menu"
			>
				<Icon name="menu" size={22} />
			</button>

			<a
				href="/"
				class="flex items-center gap-2 font-semibold text-slate-800 lg:hidden dark:text-slate-100"
			>
				<Icon name="shield" size={18} class="text-teal-600 dark:text-teal-400" /> pki-toolbox
			</a>

			<div class="ml-auto flex items-center gap-1">
				<button
					type="button"
					onclick={toggleTheme}
					class="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
					aria-label="Toggle light/dark theme"
					title="Light / dark theme"
				>
					<Icon name={theme.value === 'dark' ? 'sun' : 'moon'} size={19} />
				</button>
			</div>
		</header>

		<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
			{@render children()}
		</main>

		<footer
			class="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-400 sm:px-6 dark:border-slate-800 dark:text-slate-600"
		>
			pki-toolbox, a self-hosted PKI decoder, 100% client-side. No data ever leaves your browser.
		</footer>
	</div>
</div>
