<script lang="ts">
	/**
	 * Top navigation bar (youkyi DA). Replaces the sidebar: the four tool
	 * categories are cut dropdown folders; the active one carries the orange
	 * underline with an oblique diving terminaison. The bar sits on the page
	 * background over a full-width hairline.
	 *
	 * A11y: this is a disclosure pattern (button toggling a group of links), not a
	 * menubar — so it deliberately does NOT claim role="menu"/"menuitem", which
	 * would promise arrow-key navigation we do not implement. Escape closes the
	 * open folder and returns focus to its trigger; the current page is marked
	 * with aria-current, not colour alone.
	 */
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { categories, toolsByCategory, toolBySlug, type ToolCategory } from '$lib/tools';
	import Icon from './Icon.svelte';
	import Badge from './Badge.svelte';
	import { initTheme, toggleTheme, theme } from '$lib/theme.svelte';
	import { onMount } from 'svelte';

	onMount(initTheme);

	let openCat = $state<ToolCategory | null>(null);
	let mobileOpen = $state(false);
	let navEl: HTMLElement | undefined = $state();
	/** Trigger buttons, so Escape can hand focus back to the one that opened. */
	let triggers = $state<Partial<Record<ToolCategory, HTMLButtonElement>>>({});

	const current = $derived(page.url.pathname);
	/** Category that owns the current route (drives the active underline). */
	const activeCat = $derived(toolBySlug(current.replace(/^\//, ''))?.category ?? null);

	const themeAction = $derived(
		theme.value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
	);

	// Any navigation closes the open folder and the mobile panel.
	afterNavigate(() => {
		openCat = null;
		mobileOpen = false;
	});

	function onWindowClick(event: MouseEvent) {
		if (navEl && !navEl.contains(event.target as Node)) openCat = null;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (openCat) {
			const trigger = triggers[openCat];
			openCat = null;
			trigger?.focus();
		}
		mobileOpen = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKeydown} />

<div
	bind:this={navEl}
	class="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
>
	<nav aria-label="Primary">
		<div class="relative mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6 lg:px-8">
			<!-- Wordmark. The text and its underscore are one flex item, otherwise the
			     container's gap lands between the word and the underscore. -->
			<a
				href="/"
				class="yk-wordmark flex shrink-0 items-center gap-2.5 text-[17px] text-slate-900 dark:text-slate-100"
			>
				<span
					class="yk-chip grid h-9 w-9 place-items-center bg-slate-900 text-[color:var(--yk-accent)] dark:bg-slate-800"
				>
					<Icon name="shield" size={20} />
				</span>
				<span>pki-toolbox<u>_</u></span>
			</a>

			<!-- Desktop category folders -->
			<div class="hidden items-stretch gap-7 lg:flex">
				{#each categories as category (category.id)}
					{@const list = toolsByCategory(category.id)}
					{#if list.length}
						{@const isActive = activeCat === category.id}
						{@const isOpen = openCat === category.id}
						<div
							class="relative flex"
							role="none"
							onmouseenter={() => (openCat = category.id)}
							onmouseleave={() => openCat === category.id && (openCat = null)}
						>
							<button
								type="button"
								bind:this={triggers[category.id]}
								aria-haspopup="true"
								aria-expanded={isOpen}
								onclick={() => (openCat = isOpen ? null : category.id)}
								class="relative inline-flex items-center gap-1.5 py-2 text-sm font-medium transition-colors {isActive ||
								isOpen
									? 'text-slate-900 dark:text-slate-100'
									: 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}"
							>
								{category.label}
								<svg
									viewBox="0 0 10 6"
									width="9"
									height="6"
									aria-hidden="true"
									class="transition-transform {isOpen ? 'rotate-180' : ''}"
								>
									<polyline
										points="1,0.8 5,4.8 9,0.8"
										fill="none"
										stroke="currentColor"
										stroke-width="1.6"
										stroke-linecap="square"
									/>
								</svg>
								{#if isActive}
									<!-- underline orange + terminaison oblique plongeante -->
									<span
										class="absolute right-2 -bottom-[7px] left-0 h-[2.5px] bg-[color:var(--yk-accent)]"
									></span>
									<span
										class="absolute right-0 -bottom-[7px] h-[2.5px] w-[7px] origin-left rotate-[21deg] bg-[color:var(--yk-accent)]"
									></span>
								{/if}
							</button>

							{#if isOpen}
								<!-- top-full + transparent pt bridges the gap so the pointer never
								     leaves the wrapper on its way down to the panel. -->
								<div class="absolute top-full left-0 z-40 pt-2">
									<div class="yk-cut-bordered min-w-[248px] py-1.5">
										{#each list as tool (tool.slug)}
											{@const isCurrent = current === `/${tool.slug}`}
											<a
												href="/{tool.slug}"
												aria-current={isCurrent ? 'page' : undefined}
												class="group/item relative flex items-center gap-2.5 py-2 pr-4 pl-4 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 {isCurrent
													? 'font-medium text-slate-900 dark:text-slate-100'
													: 'text-slate-600 dark:text-slate-300'}"
											>
												<span
													class="absolute top-1 bottom-1 left-0 w-[2.5px] bg-[color:var(--yk-accent)] transition-transform group-hover/item:scale-y-100 {isCurrent
														? 'scale-y-100'
														: 'scale-y-0'}"
												></span>
												<Icon
													name={tool.icon}
													size={16}
													class="shrink-0 text-slate-500 dark:text-slate-400"
												/>
												<span class="flex-1 truncate">{tool.name}</span>
												{#if tool.status === 'beta'}<Badge tone="beta">Beta</Badge>{/if}
												{#if tool.status === 'planned'}<Badge tone="planned">Coming soon</Badge
													>{/if}
											</a>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>

			<div class="ml-auto flex shrink-0 items-center gap-2">
				<button
					type="button"
					onclick={toggleTheme}
					class="p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
					aria-label={themeAction}
					title={themeAction}
				>
					<Icon name={theme.value === 'dark' ? 'sun' : 'moon'} size={19} />
				</button>
				<!-- Right anchor (like the DA nav's CTA): bordered GitHub link. -->
				<a
					href="https://github.com/youkyi/pki-toolbox"
					target="_blank"
					rel="noopener noreferrer"
					class="hidden items-center gap-2 border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-teal-700 hover:text-slate-900 sm:inline-flex dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-400 dark:hover:text-slate-100"
				>
					<Icon name="github" size={16} /> GitHub
				</a>
				<!-- Mobile menu toggle -->
				<button
					type="button"
					onclick={() => (mobileOpen = !mobileOpen)}
					class="p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
					aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
					aria-expanded={mobileOpen}
				>
					<Icon name={mobileOpen ? 'close' : 'menu'} size={22} />
				</button>
			</div>
		</div>

		<!-- Mobile stacked menu. Inside the nav landmark, and capped to the space
		     left under the bar so the last categories stay reachable in landscape. -->
		{#if mobileOpen}
			<div
				class="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 px-4 py-3 lg:hidden dark:border-slate-800"
			>
				{#each categories as category (category.id)}
					{@const list = toolsByCategory(category.id)}
					{#if list.length}
						<p class="yk-kicker mt-3 mb-1 px-1 text-slate-500 first:mt-0 dark:text-slate-500">
							{category.label}
						</p>
						<ul class="space-y-0.5">
							{#each list as tool (tool.slug)}
								{@const isCurrent = current === `/${tool.slug}`}
								<li>
									<a
										href="/{tool.slug}"
										aria-current={isCurrent ? 'page' : undefined}
										class="flex items-center gap-2.5 border-l-2 px-2.5 py-2 text-sm transition-colors {isCurrent
											? 'border-[color:var(--yk-accent)] bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100'
											: 'border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}"
									>
										<Icon name={tool.icon} size={18} class="shrink-0" />
										<span class="flex-1 truncate">{tool.name}</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				{/each}
			</div>
		{/if}
	</nav>
</div>
