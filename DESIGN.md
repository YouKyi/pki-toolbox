---
name: pki-toolbox
description: A sealed, matte workshop for PKI artefacts: one orange, no glow, nothing leaves the room.
colors:
  paper: '#F8F7F4'
  surface-raised: '#FFFFFF'
  surface-above: '#F2EFE9'
  surface-recess: '#EAE6DE'
  ink: '#1A1816'
  ink-secondary: '#57534C'
  ink-tertiary: '#666259'
  hairline: '#E2DED6'
  hairline-strong: '#C9C3B8'
  accent: '#D6470D'
  accent-deep: '#B4380A'
  accent-text: '#AF3A0B'
  on-accent: '#FFFFFF'
  compliance-green: 'oklch(0.597 0.15 149)'
  night-paper: '#131211'
  night-surface-raised: '#211E1B'
  night-surface-above: '#282522'
  night-surface-recess: '#2E2A26'
  night-ink: '#F2F0EC'
  night-ink-secondary: '#B5AFA6'
  night-hairline: 'rgb(255 255 255 / 0.11)'
  night-hairline-strong: 'rgb(255 255 255 / 0.22)'
  night-accent: '#FF6A2E'
  night-accent-text: '#FF8F5C'
  night-on-accent: '#1D0E04'
  night-compliance-green: 'oklch(0.703 0.16 149)'
  terminal-ground: '#131211'
  terminal-bar: '#211E1B'
  terminal-hairline: '#3A342E'
  terminal-ink: '#F2F0EC'
typography:
  display:
    fontFamily: 'Space Grotesk, system-ui, sans-serif'
    fontSize: '17px'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.5px'
  headline:
    fontFamily: 'Poppins, system-ui, sans-serif'
    fontSize: 'clamp(1.875rem, 4vw, 2.25rem)'
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '-0.2px'
  title:
    fontFamily: 'Poppins, system-ui, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.2px'
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 'normal'
  label:
    fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: '10px'
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: '2.5px'
  data:
    fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: '13px'
    fontWeight: 400
    lineHeight: '20px'
    letterSpacing: 'normal'
  data-small:
    fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: '11px'
    fontWeight: 500
    lineHeight: 1.75
    letterSpacing: '0.02em'
rounded:
  check: '6px'
  micro: '8px'
  control-sm: '9px'
  control: '12px'
  field: '14px'
  card: '16px'
  plan: '24px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  '2xl': '24px'
  '3xl': '32px'
components:
  button-primary:
    backgroundColor: '{colors.accent-deep}'
    textColor: '{colors.on-accent}'
    rounded: '{rounded.control}'
    padding: '8px 16px'
  button-primary-hover:
    backgroundColor: '#8F2F09'
  button-secondary:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-secondary}'
    rounded: '{rounded.control}'
    padding: '8px 12px'
  button-secondary-hover:
    backgroundColor: '{colors.surface-above}'
  badge:
    backgroundColor: '{colors.surface-above}'
    textColor: '{colors.ink-secondary}'
    rounded: '{rounded.control-sm}'
    padding: '2px 8px'
  card:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.ink}'
    rounded: '{rounded.card}'
    padding: '16px'
  input:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.field}'
    padding: '10px 12px'
  nav-chrome:
    backgroundColor: 'rgb(255 255 255 / 0.62)'
    textColor: '{colors.ink}'
    height: '64px'
  terminal-block:
    backgroundColor: '{colors.terminal-ground}'
    textColor: '{colors.terminal-ink}'
    rounded: '{rounded.card}'
    padding: '14px 16px'
---

# Design System: pki-toolbox

## Overview

**Creative North Star: "The Sealed Workshop"**

A workshop with the door closed. Every surface is matte and mixed by hand (
paper, slate, ink), and nothing in the room is polished for show. Tools are
laid out where a working hand expects them, the measurements are legible from
across the bench, and what enters the room does not leave it. That last part is
not a metaphor the interface merely evokes: the product parses every artefact
in the page and declares `connect-src 'none'`, and the visual world is built so
that nothing looks like it phones anywhere either. No gloss, no glow, no
gradient, no borrowed shine.

The system runs on **one orange and nothing else**. A single accent, rationed to
five sanctioned uses, is the only colour in a world of matte neutrals. Its
scarcity is the mechanism: when orange appears, something is happening:
focus, a primary action, an active section, a status. Depth is carried by the
**value of a surface**, not by ornament, so planes separate the way stacked
paper separates. The 1/Φ² slope (≈ 21°) that gives the brand its silhouette is a
**signature, not a grammar**: it appears in the wordmark, on the threshold
hatch, and on the boundary between two masses, never on a button, a field, or a
badge.

Light is the default and dark is the signature: both are matte, neither is a
washed tint of the other, and the terminal block stays dark on a light page like
a screenshot pinned to a paper wall.

This world defines itself **against** four things, all confirmed: the
gradient-and-glass SaaS register (purple halos, glassmorphism cards, diffuse
shadows without offset, 3D illustrations); the neon "hacker" terminal (pure
black, phosphor green, code fonts everywhere, CRT effects): the terminal block
here is a punctual signature, never an identity; the corporate "enterprise" blue
(institutional palette, tinted icons by default, uniform cards without
hierarchy); and the undesigned raw tool that the online PKI decoder category
usually settles for.

**Key Characteristics:**

- One accent, five uses, and nothing else coloured
- Matte neutrals in both themes; zero gradient, zero halo, zero glow
- Elevation by value: at rest, a hairline **or** a shadow, never both
- Radius as the default shape (≈ 0.30 × control height); the slope is a signature
- Glass is reserved for floating chrome: the nav bar and its panels
- Mono carries data, commands and measures; it never dresses a paragraph
- Colour is never the only carrier of meaning

## Colors

Matte neutrals mixed toward paper and ink, cut by exactly one orange; the dark
theme is a second matte mix, not a dimmed copy of the light one.

### Primary

- **Kiln Orange** (`#D6470D`): the single accent. It fills the primary button,
  draws the 2px focus ring offset by 2px, underlines the active navigation
  section and lights link hover, fills a 6px status dot, and colours the
  wordmark's underscore. Nothing else.
- **Fired Orange** (`#B4380A`): the same orange taken one step down so a white
  label at 14px clears AA on the primary button. Used as fill, never as text.
- **Ember Text Orange** (`#AF3A0B`): the text-safe variant (5.7:1 on paper) for
  links, kickers and inline emphasis. In the dark theme these roles shift to
  `#FF6A2E` and `#FF8F5C`.

### Secondary

- **Proof Green** (`oklch(0.597 0.15 149)`): the compliance signal: "verified,
  conforming, proven". Tuned to the same lightness as the orange with one step
  less chroma so the orange stays the strongest signal in the room. It fills a
  marker or a dot; it never sets running text.

### Neutral

- **Workshop Paper** (`#F8F7F4`): the page ground in the light theme; matte,
  slightly warm, never white.
- **Bench White** (`#FFFFFF`) → **Raised Paper** (`#F2EFE9`) → **Recessed Paper**
  (`#EAE6DE`): the three-plane elevation ramp. Sitting on the page, above the
  previous plane, and pressed into it (a field's active ground, a track).
- **Workshop Ink** (`#1A1816`): body text and solid ink masses (the logo plate,
  a footer slab). Locked dark in every theme.
- **Half Ink** (`#57534C`) and **Quarter Ink** (`#666259`): the two secondary
  text steps: supporting copy, then meta, kickers and placeholders.
- **Chalk Line** (`#E2DED6`) and **Scored Line** (`#C9C3B8`): the 1px hairlines,
  ordinary and structural.
- **Night Paper** (`#131211`) with **Night Planes** (`#211E1B` / `#282522` /
  `#2E2A26`): the dark theme's ground and its own three-plane ramp. Night
  hairlines are **relative**, a translucent white veil (`.11` and `.22`) that
  recomputes against whatever surface it borders.

### Tertiary

- **Terminal Palette** (`#131211` ground, `#211E1B` bar, `#3A342E` hairline,
  `#F2F0EC` ink): locked, theme-independent, used only inside the terminal
  block.

### Named Rules

**The Five Uses Rule.** The orange has exactly five jobs: primary button fill,
focus ring, active-nav underline and link hover, a 6px status dot or a single
highlighted data series, and the wordmark underscore. Section backgrounds, long
text, gradients, halos and tinted-by-default icons are refused. One orange fill
per screen.

**The No Red Rule.** There is no red outside the terminal block. An error is
signalled by the orange **and** its wording, never by hue alone, and never by a
second warning colour, because an amber would read as a second orange.

**The Matte Rule.** Every neutral is mixed matte. No colour in this system is
ever expressed as a gradient, a glow, or a washed tint of another.

## Typography

**Display Font:** Space Grotesk Bold 700 (with system-ui, sans-serif)
**Headline Font:** Poppins (with system-ui, sans-serif)
**Body Font:** Inter (with system-ui, sans-serif)
**Data/Label Font:** IBM Plex Mono (with ui-monospace, SFMono-Regular, Menlo)

All four are OFL and **served locally**: eight woff2 files, zero third-party
requests, which is a product constraint before it is a typographic one.

**Character:** Space Grotesk gives the wordmark its cut geometry; Poppins keeps
headings geometric and calm; Inter does the reading work without personality
games; IBM Plex Mono is the instrument face: it carries fingerprints, DNs,
serials and commands, where character-level legibility is the whole job.

### Hierarchy

- **Display** (Space Grotesk 700, 17px, letter-spacing −0.5px): the
  `pki-toolbox_` and `youkyi_` wordmarks only.
- **Headline** (Poppins 700, 30–36px, line-height 1.15, tracking −0.2px): the
  page title, one per surface.
- **Title** (Poppins 700, 24px): tool page titles.
- **Body** (Inter 400, 16px, line-height 1.6): running copy, capped around
  65–75ch by a `max-w-2xl` measure.
- **Label** (IBM Plex Mono 400, 10px, letter-spacing 2.5px, uppercase): the
  kicker: category headings, the footer's legal line, the client-side claim.
- **Data** (IBM Plex Mono 400, 13px, line-height 20px): fingerprints,
  distinguished names, serials, values in a row list. The line box is fixed
  rather than inherited, so a row's height never depends on which face its
  value happens to use.
- **Data, small** (IBM Plex Mono 400/500, 11px): badge text and the terminal
  body, where the token or the window sets the measure rather than a text
  column.

### Named Rules

**The Mono Counts Rule.** The monospace face carries data, commands and
measures. It never dresses a paragraph, and it is never chosen for flavour.

**The Two Weights Rule.** At most two weights per screen, sentence case
throughout. Emphasis comes from size and ink strength, not from a third weight.

## Layout

A single centred column, `max-width: 72rem` (`max-w-6xl`), with 16px gutters
that open to 24px at `sm` and 32px at `lg`. The navigation bar is a full-bleed
sticky chrome 64px tall; the page content sits in 32px of vertical padding
beneath it, and the footer closes on the same measure.

The tool grid is a single column on mobile, two at `sm` (640px) and three at
`xl` (1280px), with a 12px gutter. Tool pages are single-column by intent: the
input area, then the actions, then results, a stacked reading order that
survives a 390px viewport, which the end-to-end suite enforces by failing if any
element renders content wider than its box.

Rhythm runs on a 4px base: 4 / 8 / 12 / 16 / 20 / 24 / 32. Card interiors use
16px; result cards use 20px horizontal and 16px vertical, with sections
separated by a hairline rather than by extra space. Density is deliberately
comfortable rather than compact: the user arrives mid-incident and scans.

## Elevation & Depth

Depth is carried by the **value of the surface**, not by ornament. Three planes
stack: sitting on the page (`#FFFFFF` / `#211E1B`), above the previous plane
(`#F2EFE9` / `#282522`), and pressed in (`#EAE6DE` / `#2E2A26`). A 1px hairline
appears only when two planes of the same value touch. Shadows exist, but as a
secondary reinforcement on the light theme and in print (a card lifts on hover,
a floating panel separates from the content beneath it), and never as the
primary separator.

### Shadow Vocabulary

- **Lift** (`box-shadow: 0 1px 2px rgb(26 24 22 / .05), 0 10px 24px -14px rgb(26 24 22 / .18)`):
  a card or panel raised one step, typically on hover.
- **Float** (`box-shadow: 0 2px 4px rgb(26 24 22 / .06), 0 18px 40px -22px rgb(26 24 22 / .22)`):
  chrome and dropdown panels sitting above the content.

In the dark theme both are re-mixed on black (`0 1px 2px rgb(0 0 0 / .45)` and
`0 2px 4px rgb(0 0 0 / .5)` with their long tails); they read as depth, not as
separation, because in the dark it is the value ramp that separates.

### Named Rules

**The Value-Separates Rule.** Elevation is declared once: a hairline **or** a
shadow, never both on the same edge, **at rest**. A surface that leaves the
page keeps its hairline and gains a shadow, because the hairline is what draws
its edge and the shadow is what says it has left: a card taking **Lift** on
hover, and the floating chrome taking **Float**, both carry the two. Nothing
that sits still ever does.

**The Offset Rule.** Every shadow has a vertical offset and a wide blur. A
shadow without offset is a halo, which makes it decoration, which makes it
forbidden.

**The Floating Chrome Rule.** Glass, a translucent ground plus a 20px backdrop
blur, belongs to the navigation bar and to panels that float above the content.
Never a card, never a field, never a section background. A panel is denser than
a bar: what floats over the page ground may be translucent, what sits on text
may not.

## Shapes

The radius is the default shape, and it follows the **height** of the control so
the curvature reads as constant across the interface (≈ 0.30 × height). A 32px
badge, a 40px button and a 44px field belong to one family without any of them
becoming a pill: 6px on a checkbox, 8px on inline code, 9px on a badge or small
button, 12px on a button and an icon chip, 14px on a field, 16px on a card or a
terminal block, 24px on a large plane. The pill (999px) is **reserved** for
shapes that are round by nature: a switch track, a progress bar, a status dot.
A radius outside this scale is a bug.

The 1/Φ² slope (≈ 21°, ratio 0.382) is the brand's silhouette and appears in
exactly three places on this surface: the wordmark and y-mark, the threshold
hatch that marks the shift from chrome to content, and the footer's boundary
between two masses. Borders are 1px hairlines. Two thicker strokes exist, and
both mark a state rather than an edge: **2px** for the dashed drop zone, and
**2.5px** for the accent markers that say "you are here": the active-nav
underline and the current item's bar in a dropdown.

A block that carries a **state** takes the accent on its whole hairline: the
alert, and the input box while it holds a private key. Never a coloured rail
down one side. That rail is the house style of the generated web, it says
nothing the hairline does not say, and one vocabulary is enough: what is in
question is ringed, never barred.

### Named Rules

**The Slope Is a Signature Rule.** The slope never governs a control. No cut
button, no cut field, no cut badge, no clipped card corner.

**The Threshold Rule.** The hatch is localised and faded: it marks the shift
from one zone to another and dissolves before it occupies a surface. One per
page, at the top of the content, never a full background.

## Components

**Character:** calm at rest, blunt on state. Controls stay neutral until they
are touched; the orange only appears at the moment something happens: focus, a
primary action, an active section, a status.

### Buttons

- **Shape:** softly curved (12px, `{rounded.control}`), never a pill, never cut.
- **Primary:** fired orange fill (`#B4380A`) with a white semibold label at 14px
  and 8px/16px padding; in the dark theme the fill becomes `#FF6A2E` with an
  ink label (`#1D0E04`). One per screen.
- **Hover / Focus:** hover deepens the fill (`#8F2F09`); focus draws a 2px
  orange ring offset by 2px. Every pressable element also answers the press
  itself with a 0.985 scale over 90ms, feedback on press, not on release.
- **Secondary:** hairline outline (`#C9C3B8`), ink label, neutral surface on
  hover. **Tertiary:** label only, ink text turning to ember orange on hover.

### Chips

- **Style:** icon chips are neutral, never tinted: a raised-paper square
  (`#F2EFE9` / night `rgb(255 255 255 / .11)`) at 12px radius with ink glyph,
  36–44px. The logo chip inverts this: a solid ink plate with paper glyph.
- **State:** the tool card's chip steps one plane deeper on hover.

### Badges

- **Style:** a neutral token: raised-paper ground, hairline ring, 9px radius,
  mono at 11px.
- **State:** meaning arrives as a **6px dot** preceding the label: proof green
  for verified/ready/root, orange for expired, pending or beta, no dot for
  neutral and planned. The label always carries the meaning on its own.

### Cards / Containers

- **Corner Style:** 16px (`{rounded.card}`).
- **Background:** bench white on paper (`#FFFFFF` / night `#211E1B`).
- **Shadow Strategy:** flat at rest with a hairline; **Lift** on hover, where the
  hairline also takes the orange.
- **Border:** 1px chalk line; internal sections separate with a hairline, not a
  gap.
- **Internal Padding:** 16px, or 20px/16px on result cards.

### Inputs / Fields

- **Style:** transparent ground inside a hairline, 14px radius; the PEM area is
  a 2px dashed drop zone with a mono 13px body at `h-64`.
- **Focus:** a 2px orange ring offset by 2px, plus a 2px inner ring on the
  textarea. Native controls take the orange as `accent-color`.
- **Drop-active:** the dashed border turns orange and the ground steps one plane
  up, with a centred "Drop the file" label.
- **Error:** ember orange text with its wording; never a red field.
- **Proof strip:** the top row of the box carries the lock glyph and the claim at
  body size, with a **Verify** disclosure on the right. The panel it opens shows
  the page's own `connect-src` directive read back from the served policy, the
  number of requests able to carry data out since the reader pasted, and a live
  attempt the browser refuses in front of them. The claim is stated where the
  artefact is handed over, never under the action row after the fact, and it is
  never stated without the means to check it.
- **Private key state:** whatever the tool, a private key in the box is covered
  by an opaque veil that names it, states that it has not left the page, and
  offers **Clear it** or **Show it anyway**. Hiding the material *is* the
  message, and it holds the same rule the keystore decoder already states. Where
  a key is asked for, the signing page's CA field, the veil stays but drops the
  accent: it is a discretion, not an alarm.
- **Doorway:** the home page carries the same input at half height, as an
  entry point rather than a workbench: it only has to recognise what was
  pasted, name it, and hand it to the tool that reads it. Every property of the
  shared box rides along, the no-network proof, the key veil, the file drop.
- **Shortcut:** `/` puts the caret in the input from anywhere on the page, and
  reopens the folded editor first if the artefact is already decoded. With
  `Ctrl/⌘ + Enter` to decode, those are the product's two accelerators, and both
  are stated under the box rather than left to be discovered.
- **Folded state:** once the artefact is decoded the editor becomes a one-line
  recap on the raised plane, naming what was read and its size, with **Edit
  input** and **Clear**. The answer is worth more screen than the base64 the
  reader just pasted. Folding is the shared behaviour; a page that wants the
  editor to stay open declares it.
- **Group fold:** where several fields form one input validated by a single
  button, the CA certificate and its key on the signing page, they fold and
  unfold on the same flag: one **Edit input** reopens the whole group. A recap
  never derives anything from a private key, only the field's name and the byte
  size of what was pasted.

### Navigation

- **Style:** a 64px sticky bar in glass (`rgb(255 255 255 / .62)` over a 20px
  blur, night `rgb(26 25 23 / .58)`), closed by a full-width hairline, with an
  opaque fallback where backdrop-filter is unsupported.
- **States:** category triggers are half-ink and turn full ink on hover; the
  active category carries a 2.5px orange underline. Dropdown panels are glass
  cards (16px radius, **Float** shadow) whose items reveal a 2.5px orange bar on
  the left edge, scaled from 0 on hover and pinned for the current page.
- **Panels are denser than the bar** (94% light, 95% dark, same 20px blur). A
  bar floats over the page ground and can afford to be translucent; a panel
  sits on **text**, and at the bar's value the lines underneath read through it.
- **Mobile:** a stacked panel under the bar, capped to the remaining viewport
  height, items at 12px radius with a left border that takes the orange when
  current. Current page is marked with `aria-current`, not colour alone.

### Theme control

- **Style:** a ghost button in the bar carrying the mode's glyph, its label and
  a caret, opening a radio menu of three rows (**Auto**, **Light**, **Dark**),
  the selected one taking the accent tick.
- **Character:** the control states the **mode**, never the colour it currently
  resolves to. A two-state toggle cannot express "follows the system"; it can
  only leave the reader guessing which of its two states means "I did not
  choose". `auto` is the default and is a persisted answer like any other.
- **Glyphs:** a sun for light, a crescent for dark, and a **half-filled disc**
  for auto: neither one nor the other, which is what the mode means.

### Row list

- **Rhythm:** every single-line row is **40px** (20px of line box plus 10px
  above and below), whatever face its value uses. The line height is declared,
  not inherited: left to the font metrics, a mono value produced 18.57px and a
  sans value 20px, so a row's height depended on its content. A wrapping value
  grows by whole 20px steps.
- **Separator:** a 1px hairline between rows, none after the last, and the last
  row drops its bottom padding so a list ends on the same breath it keeps
  inside.
- **Copy affordance:** a 44px hit box bled into the row's padding with a
  negative margin, so it changes neither the rhythm nor the glyph's alignment,
  and an inner span carries everything **painted**: a 44px hover surface would
  reach into the rows above and below.

### Carry line

- **Style:** one quiet line of tertiary ink under the result, "Same artefact
  in" followed by the tools that read it, as underlined text buttons.
- **Character:** the list comes from what the artefact **is**, never from the
  page it sits on, so a revocation list is never offered a tool that decodes
  certificates. The artefact travels in memory, never in a query string: a PKI
  artefact in a URL is one in a history file, a proxy log and a bookmark sync.

### Status line (invisible component)

One short sentence per result, for assistive technology only: _"Certificate
decoded: ISRG Root X1"_, _"Decoding failed: …"_. A live region is for the
**news**, not for the document: the result itself used to be announced, which
recited some forty rows including three hex fingerprints with no way to
interrupt. The detail is reached by walking into the result, which takes focus
on success.

### Terminal Block (signature component)

Code is rendered as a **dark terminal window, on every theme**, the way a
screenshot stays dark on a paper page. Locked palette (`#131211` ground,
`#211E1B` bar, `#3A342E` hairline, `#F2F0EC` ink), 16px radius, IBM Plex Mono at
12px/1.75, body scrolling horizontally rather than wrapping code. The bar
carries three 9px dots (two neutral, one orange "live"), then the artefact
title, then the block's own actions in outlined mono buttons. The bar wraps on
narrow viewports rather than truncating the title, because that title is the
only thing naming the artefact.

**Folded**, a block is its bar and nothing under it: a closed terminal window.
Copy and download stay in that bar, because a form a reader takes away without
reading (the DER behind a PEM) still has to be one click from the clipboard.
Only a secondary form folds; the artefact a page exists to produce never does.

## Do's and Don'ts

### Do:

- **Do** keep exactly one orange fill per screen, and spend the accent only on
  its five sanctioned uses.
- **Do** separate planes with the value ramp (`#FFFFFF` → `#F2EFE9` → `#EAE6DE`,
  night `#211E1B` → `#282522` → `#2E2A26`), adding a hairline only where two
  planes of the same value touch.
- **Do** pick the radius from the scale by control height (6 / 8 / 9 / 12 / 14 /
  16 / 24px), and reserve the pill for shapes that are round by nature.
- **Do** double every colour signal with an icon, a dot **and** a label: status
  must survive greyscale.
- **Do** render code as the dark terminal block, whatever the page theme.
- **Do** keep hairlines relative in the dark theme (`rgb(255 255 255 / .11)` and
  `/.22`) so they track the surface they border.
- **Do** give every shadow a vertical offset and a wide blur.
- **Do** keep the threshold hatch localised and faded, one per page.

### Don't:

- **Don't** cut a control at the slope: no cut button, field, badge, or clipped
  card corner. The slope belongs to the wordmark, the threshold hatch, and a
  boundary between masses.
- **Don't** introduce a second accent, an amber warning, or any red outside the
  terminal block; an error is orange plus its wording.
- **Don't** tint an icon by default, or fill a badge, alert, or section
  background with the accent.
- **Don't** use glass anywhere but the floating chrome: not on a card, a field,
  or a section.
- **Don't** ship a gradient, a glow, or a shadow without offset.
- **Don't** set running text in the monospace face, or a paragraph in the
  compliance green.
- **Don't** load a font, a script, or an image from a third-party origin; every
  asset is served from this origin, which the CSP enforces.
- **Don't** let any element render content wider than its box at 390px: the
  end-to-end suite fails the pipeline for it.
- **Don't** let a hit area be the painted area: enlarge the box for the thumb,
  keep the paint at the glyph's size.
- **Don't** write a rule that sets `display` outside the `components` layer:
  an ordinary rule after the Tailwind import outranks `lg:hidden` and friends
  by source order alone.
