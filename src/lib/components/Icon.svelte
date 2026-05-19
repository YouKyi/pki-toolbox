<script module lang="ts">
	/**
	 * Lightweight inline-SVG icon set (Tabler-style, 24×24, stroked).
	 * Zero dependencies — each entry is the trusted inner markup of the icon.
	 */
	const ICONS: Record<string, string> = {
		certificate:
			'<path d="M15 15m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M13 17.5v4.5l2 -1.5l2 1.5v-4.5" /><path d="M10 19h-5a2 2 0 0 1 -2 -2v-10c0 -1.1 .9 -2 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -1 1.73" /><path d="M6 9l12 0" /><path d="M6 12l3 0" /><path d="M6 15l2 0" />',
		'file-text':
			'<path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 9l1 0" /><path d="M9 13l6 0" /><path d="M9 17l6 0" />',
		link: '<path d="M9 15l6 -6" /><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" /><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" />',
		fingerprint:
			'<path d="M18.9 7a8 7 0 0 1 1.1 4v3" /><path d="M8 11a4 3.5 0 0 1 8 0v4a6 5 0 0 0 .9 3" /><path d="M12 11v4a10 8 0 0 0 2 6" /><path d="M5 19a16 13 0 0 1 -1 -8a8 7 0 0 1 13 -5.5" /><path d="M8 15a18 14 0 0 0 1.5 6" />',
		ban: '<circle cx="12" cy="12" r="9" /><path d="M5.7 5.7l12.6 12.6" />',
		package:
			'<path d="M12 3l8 4.5v9l-8 4.5l-8 -4.5v-9l8 -4.5" /><path d="M12 12l8 -4.5" /><path d="M12 12v9" /><path d="M12 12l-8 -4.5" /><path d="M16 5.25l-8 4.5" />',
		lock: '<rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" /><circle cx="12" cy="16" r="1" />',
		tree: '<rect x="9" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M12 9v3" /><path d="M6 15v-1a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1v1" />',
		globe:
			'<circle cx="12" cy="12" r="9" /><path d="M3.6 9h16.8" /><path d="M3.6 15h16.8" /><path d="M11.5 3a17 17 0 0 0 0 18" /><path d="M12.5 3a17 17 0 0 1 0 18" />',
		convert: '<path d="M7 10h14l-4 -4" /><path d="M17 14h-14l4 4" />',
		sparkles:
			'<path d="M12 3l1.8 5.2l5.2 1.8l-5.2 1.8l-1.8 5.2l-1.8 -5.2l-5.2 -1.8l5.2 -1.8z" /><path d="M19 15l.7 2l2 .7l-2 .7l-.7 2l-.7 -2l-2 -.7l2 -.7z" />',
		menu: '<path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />',
		close: '<path d="M6 6l12 12" /><path d="M18 6l-12 12" />',
		sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.9 4.9l1.4 1.4" /><path d="M17.7 17.7l1.4 1.4" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M4.9 19.1l1.4 -1.4" /><path d="M17.7 6.3l1.4 -1.4" />',
		moon: '<path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />',
		home: '<path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />',
		github:
			'<path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5" />',
		check: '<path d="M5 12l5 5l10 -10" />',
		'alert-triangle':
			'<path d="M12 9v4" /><path d="M10.24 3.957l-8.422 14.06a1.989 1.989 0 0 0 1.7 2.983h16.845a1.989 1.989 0 0 0 1.7 -2.983l-8.422 -14.06a1.989 1.989 0 0 0 -3.4 0z" /><path d="M12 16h.01" />',
		upload:
			'<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4v12" />',
		copy: '<rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />',
		'chevron-down': '<path d="M6 9l6 6l6 -6" />',
		shield:
			'<path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />',
		info: '<circle cx="12" cy="12" r="9" /><path d="M12 8h.01" /><path d="M11 12h1v4h1" />',
		clock: '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />'
	};

	const FALLBACK = '<circle cx="12" cy="12" r="2" />';
</script>

<script lang="ts">
	type Props = { name: string; size?: number; class?: string };
	let { name, size = 20, class: klass = '' }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={klass}
	aria-hidden="true"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted static icon markup -->
	{@html ICONS[name] ?? FALLBACK}
</svg>
