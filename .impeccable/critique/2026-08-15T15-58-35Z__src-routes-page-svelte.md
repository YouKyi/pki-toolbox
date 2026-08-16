---
target: home page + decode-certificate tool page
total_score: 26
max_score: 40
na_heuristics:
p0_count: 2
p1_count: 3
timestamp: 2026-08-15T15-58-35Z
slug: src-routes-page-svelte
---

Method: dual-agent (A: design review, isolated · B: detector + browser measurement, isolated).
Target: home page + representative tool page (`src/routes/+page.svelte`, `src/routes/decode-certificate/+page.svelte`). Mode: Operate.

## Design Health Score: 26/40 (Acceptable)

| #         | Heuristic                       | Score     | Key issue                                                                                  |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------ |
| 1         | Visibility of system status     | 3         | Nothing announces the result arrived; focus never moves; the answer appears below the fold |
| 2         | Match system / real world       | 3         | `expires in 3214 day(s)`, 40-digit decimal serial                                          |
| 3         | User control and freedom        | 3         | No way to hold one result while decoding a second; Clear is irreversible                   |
| 4         | Consistency and standards       | 3         | Orange dots on every SAN; invisible ink plate in dark                                      |
| 5         | Error prevention                | 2         | No warning when a private key is pasted; a .p12 is silently wrapped as BEGIN CERTIFICATE   |
| 6         | Recognition rather than recall  | 3         | All 11 tools visible; no search, no recents                                                |
| 7         | Flexibility and efficiency      | 2         | Ctrl/Cmd+Enter is the only accelerator; no URL state, no cross-tool handoff                |
| 8         | Aesthetic and minimalist design | 3         | Restrained; deducted for splash, redundant h1, dead zones                                  |
| 9         | Error recovery                  | 2         | Alert body is the raw thrown PKI error, no recovery path                                   |
| 10        | Help and documentation          | 2         | The verifiable-zero-network claim has no in-page verification path                         |
| **Total** |                                 | **26/40** | **Acceptable**                                                                             |

## Design specificity verdict

Home grid is category-interchangeable: swap tools.ts for eleven JSON utilities and nothing changes. Equal typographic weight for the ~80% case and the ~2% case; the four category headings are the weakest text on the page while carrying its structure. The composition never admits the visitor arrives with a certificate already on the clipboard.

Tool page flow is specific and the best thing in the product. Result presentation falls back to generic: five identical sections, fifteen equal-weight rows, no answer layer.

Deterministic scan: 2 findings (Badge.svelte:57 `text-[11px]`, Navbar.svelte:219 `border-l-2`), both FALSE POSITIVES verified against DESIGN.md. But the scan exposed three self-contradictions inside DESIGN.md itself: the 11px badge step is absent from the frontmatter type ramp; "the only 2.5px stroke is the active-nav underline" is false (the dropdown item bar is 2.5px too); and the Value-Separates Rule is violated by the dropdown panel, which carries a hairline AND the Float shadow on the same edge (measured).

Visual overlays: none available (no browser extension connected). All evidence from headless container measurement against the real build.

## Overall impression

Disciplined, honest work, well above its category, and it makes its user wait twice: behind a loading screen on a prerendered static page that has nothing to load, and again by placing the answer below the fold behind the base64 the user just pasted. Biggest opportunity: the product asserts what it could prove.

## What's working

1. `Load an example` with a real artefact (ISRG Root X1), a risk-free dry run for a user whose whole reason for being here is "I'm not allowed to upload this". Best UX decision in the product.
2. Colour discipline pays off in the result: zero red-family colours measured on the whole result page in both themes. The card reads as data, not a traffic light, and scans faster than every online competitor.
3. The 390px responsive guard holds on the hard cases (measured: scrollWidth == clientWidth == 390 on both routes, both themes, before and after decode). Focus visible on 36/36 focusables, ring at 3.99:1 light / 6.62:1 dark.

## Priority issues

### [P0] The splash delays the answer on a page that has nothing to load

`#yk-loader` blocks first paint for `load + 220ms`, capped at 1600ms, on every new tab. The whole architectural argument buys a sub-100ms paint and the interface spends it on an animated bar; it also masks the page from screen readers. Fix: delete the loader, or drop the 220ms floor and 1600ms ceiling to zero and let `yk-ready` be the only gate. Command: /impeccable optimize

### [P0] No answer layer; the result sits below the fold

At 1280x900, `Valid until` lands around y938, off-screen, because the `h-64` textarea never collapses after a successful decode and holds ~330px of viewport showing base64 the user already has. The three questions that bring this user here all require scrolling past their own input. Fix: collapse the textarea to a two-line strip on success; promote a verdict band at the top of CertCard (CN, absolute expiry date + relative, issuer, SAN count); move focus to the result. Command: /impeccable layout

### [P1] The dark theme fails contrast in six places, one root cause

Measured: textarea placeholder 2.45:1, category kicker 3.48:1, helper text 3.48:1, mobile-panel kicker 3.36:1, and the five CertCard section headings at 3.08:1. Four of six share one cause: `dark:text-slate-500` resolves to `#6e6a63`, the light-theme muted step, on night surfaces. Plus the logo plate, `#1a1816` locked on a `#131211` ground, ~1.1:1, so the plate disappears in the theme the charter calls "signature". Fix: move those roles to the dark `--yk-ink-3` step (`#9a938a`); invert the plate in dark. Command: /impeccable audit then /impeccable polish

### [P1] Accessibility wiring fails where it counts

The live region wraps the entire CertCard: a successful decode recites ~40 rows including three hex fingerprints with no way to interrupt. `fileError` renders outside any live region with no `role="alert"`: an 8MB drop announces nothing. The textarea carries `required` but never `aria-invalid` or `aria-describedby` to the alert. Heading structure skips a level after decode (h1 -> h3, confirmed independently by both assessments) and the certificate CN is a `<p>`, so heading navigation never names the certificate. 25 touch targets under 44px at 390px, four copy buttons at 23x23. Command: /impeccable harden

### [P1] The claim is asserted, never shown, and asserted after the risk

"Everything is decoded locally in your browser, no data is sent." sits at `text-xs text-slate-500`, the faintest ink on the page, below the action row, i.e. after commitment. At the actually sensitive moment the surface says nothing, and the control receiving the most critical artefact is a grey dashed rectangle. PRODUCT.md principle 1 requires every privacy claim to be verifiable in under a minute. Fix: move the claim into the drop zone's empty state at body size; add a `Verify: 0 requests` affordance citing `connect-src 'none'` and counting PerformanceObserver resource entries since decode. Command: /impeccable clarify

Ranked just below, also P1: the home page is a directory where it should be an entry point: eleven equal cards, no search, no paste target, 2265px of scroll at 390px, while the PEM/DER auto-detect logic already exists in `PemInput.readFile`.

## Persona red flags

**Alex (power user):** `Subject` and `Issuer` (the two strings pasted into the incident ticket) have no copy button; only `Serial number` does. No `/` or Cmd+K. No URL state, nothing shareable, and Clear destroys it. Decode a cert then want its ASN.1 tree: re-paste by hand.

**Sam (screen reader / keyboard):** see P1 above. Additionally the primary button ships disabled at `opacity-50`, compositing its white label to ~1.6:1 as the control's arrival state. The dropdown opens on `mouseenter` of a `div role="none"` (pointer-only behaviour). Badge rings vanish in dark, `ring-slate-800` being the same token as their own fill. Theme never reads `prefers-color-scheme`: a dark-OS user gets a near-white full-viewport flash before any control is reachable.

**Riley (stress tester):** pasting a private key gives a generic parse error, no detection, no "we did not transmit it", no prompt to clear. A .p12 dropped on the certificate decoder is wrapped as BEGIN CERTIFICATE and errors about a certificate the user never claimed. A certificate with 200 SANs renders 200 orange dots at once (`tone="accent"`), turning the rationed accent into wallpaper.

## Minor observations

- The signature slope is not 21 degrees anywhere: the footer SVG uses `preserveAspectRatio="none"`, so the notch is ~4 degrees at 1280px and ~13 degrees at 390px. The one place the charter's signature is drawn, it is drawn wrong at every width.
- The home `<h1>` restates the wordmark 40px above it: the page's largest type for zero information.
- "11 tools are available today" is a metric nobody asked for.
- `--color-slate-800` serves as both a border token and a background token; it works by arithmetic coincidence, not construction.
- `Clear` carries `ml-auto`, the only control whose position depends on viewport.
- Zero console errors and zero failed requests across 8 page loads; all four brand faces served from origin.

## Questions to consider

1. If nothing leaving the page is the product, why can't the page prove it?
2. Why does a 100% offline, prerendered, statically served tool have a loading screen?
3. What survives if the home grid becomes one paste box that detects and routes?
4. `Valid` and `Expired` are two 6px dots of near-identical lightness: either the dot earns its place through shape, or it is the decoration the charter bans.
5. If you had to delete ten of the fifteen card rows for the first screen, which five stay, and why isn't that the default?
