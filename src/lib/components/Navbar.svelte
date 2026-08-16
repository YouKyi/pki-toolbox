<script lang="ts">
	/**
	 * Top navigation bar (youkyi DA v2). Replaces the sidebar: the four tool
	 * categories are dropdown folders and the active one carries the orange
	 * underline. The bar is the site's floating chrome, so it is the one surface
	 * the charter renders in glass, over a full-width hairline.
	 *
	 * A11y: this is a disclosure pattern (button toggling a group of links), not a
	 * menubar, so it deliberately does NOT claim role="menu"/"menuitem", which
	 * would promise arrow-key navigation we do not implement. Escape closes the
	 * open folder and returns focus to its trigger; the current page is marked
	 * with aria-current, not colour alone.
	 */
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { categories, toolsByCategory, toolBySlug, type ToolCategory } from '$lib/tools';
	import Icon from './Icon.svelte';
	import Badge from './Badge.svelte';
	import {
		initTheme,
		setThemeMode,
		theme,
		THEME_ICON,
		THEME_LABEL,
		THEME_MODES,
		type ThemeMode
	} from '$lib/theme.svelte';
	import { onMount } from 'svelte';

	onMount(initTheme);

	/**
	 * A folder opens on hover and on click, and never closes on the trigger
	 * itself: moving the pointer to a trigger already opened the folder, so a
	 * toggle would shut what the hover had just raised, and a click would look
	 * like it did nothing. Leaving the folder closes it, and so do Escape, a
	 * click outside the bar and any navigation.
	 */
	let openCat = $state<ToolCategory | null>(null);
	let mobileOpen = $state(false);
	let themeOpen = $state(false);
	let navEl: HTMLElement | undefined = $state();
	let themeTrigger: HTMLButtonElement | undefined = $state();
	/** Trigger buttons, so Escape can hand focus back to the one that opened. */
	let triggers = $state<Partial<Record<ToolCategory, HTMLButtonElement>>>({});

	const current = $derived(page.url.pathname);
	/** Category that owns the current route (drives the active underline). */
	const activeCat = $derived(toolBySlug(current.replace(/^\//, ''))?.category ?? null);

	/** The control states the MODE, not the colour it currently resolves to. */
	const themeLabel = $derived(
		`Theme: ${THEME_LABEL[theme.mode]}${theme.mode === 'auto' ? ' (follows the system)' : ''}`
	);

	function chooseTheme(mode: ThemeMode) {
		setThemeMode(mode);
		themeOpen = false;
		themeTrigger?.focus();
	}

	// Any navigation closes the open folder and the mobile panel.
	afterNavigate(() => {
		openCat = null;
		mobileOpen = false;
		themeOpen = false;
	});

	function onWindowClick(event: MouseEvent) {
		if (navEl && !navEl.contains(event.target as Node)) {
			openCat = null;
			themeOpen = false;
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (openCat) {
			const trigger = triggers[openCat];
			openCat = null;
			trigger?.focus();
		}
		if (themeOpen) {
			themeOpen = false;
			themeTrigger?.focus();
		}
		mobileOpen = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKeydown} />

<div bind:this={navEl} class="yk-chrome sticky top-0 z-40 border-b">
	<nav aria-label="Primary">
		<div class="relative mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6 lg:px-8">
			<!-- Wordmark. The text and its underscore are one flex item, otherwise the
			     container's gap lands between the word and the underscore. -->
			<a
				href="/"
				class="yk-wordmark flex min-h-11 shrink-0 items-center gap-2.5 text-[17px] text-slate-900 dark:text-slate-100"
			>
				<!-- `ink` and `page` swap with the theme, so the plate inverts on its own:
				     dark plate on paper in light, paper plate on ink in dark. The locked
				     `--yk-ink-solid` used before sat at roughly 1.1:1 against the night
				     ground, so the plate vanished in the theme the charter calls its
				     signature. -->
				<span class="yk-chip grid h-9 w-9 place-items-center bg-ink text-page">
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
						<!-- Opens on hover, and so does the theme control beside it: one gesture
						     for every folder in the bar. -->
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
								onclick={() => (openCat = category.id)}
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
									<!-- Soulignement orange plein : emploi 3 du territoire de l'accent.
									     La terminaison oblique de la v1 est retirée : en v2 la pente ne
									     s'applique plus à un contrôle. -->
									<span
										class="absolute right-0 -bottom-[7px] left-0 h-[2.5px] rounded-full bg-[color:var(--yk-accent)]"
									></span>
								{/if}
							</button>

							{#if isOpen}
								<!-- top-full + transparent pt bridges the gap so the pointer never
								     leaves the wrapper on its way down to the panel. -->
								<div class="absolute top-full left-0 z-40 pt-2">
									<!-- Panneau posé au-dessus du contenu : avec la barre, c'est le seul
									     endroit où la charte v2 autorise le verre. -->
									<div
										class="yk-chrome yk-chrome--panel min-w-[248px] overflow-hidden rounded-xl border py-1.5 shadow-md"
									>
										{#each list as tool (tool.slug)}
											{@const isCurrent = current === `/${tool.slug}`}
											<a
												href="/{tool.slug}"
												aria-current={isCurrent ? 'page' : undefined}
												class="group/item relative flex items-center gap-2.5 py-2 pr-4 pl-4 text-sm transition-colors hover:bg-surface-2 {isCurrent
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
				<!-- Three modes, not a two-state flip: "follows the system" is an answer
				     in its own right, and a toggle cannot express it: it can only leave
				     the reader guessing which of the two states means "I did not
				     choose". The control states the mode, never the resolved colour. -->
				<!-- The same gesture as the folders beside it: the bar behaves one way,
				     whichever of its controls the pointer meets. The click toggle stays
				     for the keyboard and for touch, where a tap is what raises it. -->
				<div
					class="relative"
					role="none"
					onmouseenter={() => (themeOpen = true)}
					onmouseleave={() => (themeOpen = false)}
				>
					<button
						type="button"
						bind:this={themeTrigger}
						onclick={() => (themeOpen = true)}
						aria-haspopup="true"
						aria-expanded={themeOpen}
						aria-label={themeLabel}
						title={themeLabel}
						class="yk-pressable inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 transition hover:bg-surface-2 dark:text-slate-300"
					>
						<Icon name={THEME_ICON[theme.mode]} size={17} />
						<span class="hidden sm:inline">{THEME_LABEL[theme.mode]}</span>
						<svg
							viewBox="0 0 10 6"
							width="9"
							height="6"
							aria-hidden="true"
							class="transition-transform {themeOpen ? 'rotate-180' : ''}"
						>
							<polyline
								points="1,0.8 5,4.8 9,0.8"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="square"
							/>
						</svg>
					</button>

					{#if themeOpen}
						<!-- The 8px stand-off is padding INSIDE the panel's box, not a margin
						     outside it, exactly as the category folders do it. As a margin it
						     was dead space: crossing it on the way down left the control, the
						     pointer left the group, and the menu shut before it could be
						     reached. The gap looks the same and the hit region is continuous. -->
						<div class="absolute top-full right-0 z-40 pt-2">
							<div
								class="yk-chrome yk-chrome--panel min-w-[180px] overflow-hidden rounded-xl border py-1.5 shadow-md"
								role="menu"
								aria-label="Theme"
							>
								{#each THEME_MODES as mode (mode)}
									{@const on = theme.mode === mode}
									<button
										type="button"
										role="menuitemradio"
										aria-checked={on}
										onclick={() => chooseTheme(mode)}
										class="flex min-h-11 w-full items-center gap-2.5 px-4 text-sm transition-colors hover:bg-surface-2 {on
											? 'font-medium text-slate-900 dark:text-slate-100'
											: 'text-slate-600 dark:text-slate-300'}"
									>
										<Icon name={THEME_ICON[mode]} size={16} class="shrink-0 text-ink-3" />
										<span class="flex-1 text-left">{THEME_LABEL[mode]}</span>
										{#if on}
											<Icon name="check" size={15} class="shrink-0 text-[color:var(--yk-accent)]" />
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
				<!-- Right anchor (like the DA nav's CTA): bordered GitHub link. -->
				<a
					href="https://github.com/youkyi/pki-toolbox"
					target="_blank"
					rel="noopener noreferrer"
					class="yk-pressable hidden items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-teal-700 hover:text-slate-900 sm:inline-flex dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-400 dark:hover:text-slate-100"
				>
					<Icon name="github" size={16} /> GitHub
				</a>
				<!-- Mobile menu toggle -->
				<button
					type="button"
					onclick={() => (mobileOpen = !mobileOpen)}
					class="yk-hit yk-pressable rounded-lg p-2 text-slate-600 transition hover:bg-surface-2 lg:hidden dark:text-slate-300"
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
						<p class="yk-kicker mt-3 mb-1 px-1 text-ink-3 first:mt-0">
							{category.label}
						</p>
						<ul class="space-y-0.5">
							{#each list as tool (tool.slug)}
								{@const isCurrent = current === `/${tool.slug}`}
								<li>
									<a
										href="/{tool.slug}"
										aria-current={isCurrent ? 'page' : undefined}
										class="flex min-h-11 items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2 text-sm transition-colors {isCurrent
											? 'border-[color:var(--yk-accent)] bg-surface-2 font-medium text-slate-900 dark:text-slate-100'
											: 'border-transparent text-slate-600 hover:bg-surface-2 dark:text-slate-300'}"
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
