# Web rules

Rules for React DOM and any React-based web framework.
Every rule maps to one or more [WCAG 2.2](https://www.w3.org/TR/WCAG22/) success criteria.

> **These complement [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y).**
> react-a11y's web pack contains only the rules jsx-a11y does *not* — the WCAG
> 2.2 criteria, document structure, focus visibility, and project-wide checks.
> Run jsx-a11y in your ESLint config for standard web a11y (alt text, ARIA
> validity, role/element semantics); the two don't overlap, so they run together
> cleanly.

| Rule | Severity | WCAG |
| --- | --- | --- |
| [button-has-accessible-name](#button-has-accessible-name) | critical | 4.1.2 |
| [input-button-has-name](#input-button-has-name) | serious | 4.1.2, 1.1.1 |
| [title-has-content](#title-has-content) | serious | 2.4.2 |
| [meta-viewport-zoomable](#meta-viewport-zoomable) | serious | 1.4.4 |
| [no-meta-refresh](#no-meta-refresh) | serious | 2.2.1 |
| [media-no-autoplay](#media-no-autoplay) | serious | 1.4.2 |
| [aria-required-context](#aria-required-context) | moderate | 1.3.1, 4.1.2 |
| [heading-order](#heading-order) | moderate | 1.3.1, 2.4.6 |
| [list-structure](#list-structure) | moderate | 1.3.1 |
| [table-has-header](#table-has-header) | moderate | 1.3.1 |
| [fieldset-has-legend](#fieldset-has-legend) | moderate | 1.3.1, 3.3.2 |
| [no-duplicate-main](#no-duplicate-main) | moderate | 1.3.1, 2.4.1 |
| [form-control-has-label](#cross-file-label-resolution) | serious | 1.3.1, 3.3.2, 4.1.2 |
| [no-outline-none](#no-outline-none) | moderate | 2.4.7 |
| [accessible-authentication](#accessible-authentication) | serious | 3.3.8 |
| [error-identification](#error-identification) | moderate | 3.3.1 |
| [no-autocomplete-off](#no-autocomplete-off) | moderate | 3.3.7, 1.3.5 |
| [label-in-name](#label-in-name) | moderate | 2.5.3 |
| [pointer-cancellation](#pointer-cancellation) | moderate | 2.5.2 |
| [color-contrast](#color-contrast) | serious | 1.4.3 |
| [target-size](#target-size) | serious | 2.5.8, 2.5.5 |
| [meaningful-order](#meaningful-order) | minor | 1.3.2, 2.4.3 |

## button-has-accessible-name

A `<button>` or `role="button"` element with no text, `aria-label` or labelled
child is announced as an unnamed button. Icon-only buttons need `aria-label`.

## input-button-has-name

`<input type="button">` needs a `value` or `aria-label`; `<input type="image">`
needs `alt`. Without them the control is announced as unnamed.

## title-has-content

An empty `<title>` leaves the page unnamed in tabs, history and screen reader
announcements.

## meta-viewport-zoomable

`user-scalable=no` or `maximum-scale` below 2 on the viewport meta tag blocks
pinch-zoom, so low-vision users cannot enlarge the page (WCAG 1.4.4).

## no-meta-refresh

`<meta http-equiv="refresh">` reloads or redirects on a timer users cannot pause
or adjust (WCAG 2.2.1).

## media-no-autoplay

`<video>`/`<audio>` with `autoPlay` and sound talk over screen readers. Add
`muted`, or start paused. Media with `controls` is downgraded since users can
stop it.

## aria-required-context

Roles like `tab`, `option` and `menuitem` only work inside their required parent
(`tablist`, `listbox`, `menu`). A managed widget role with no such ancestor is
announced incorrectly. Component ancestors and implicit roles are given the
benefit of the doubt.

## heading-order

Heading levels must not skip (e.g. `<h2>` followed by `<h4>`), which breaks the
document outline screen reader users navigate by.

## list-structure

`<ul>`/`<ol>` may only contain `<li>` (and script/template); a stray `<li>`
needs a list parent. Dynamic children and component wrappers are skipped.

## table-has-header

A data `<table>` needs at least one `<th>`, or screen readers cannot associate
cells with their headers. `role="presentation"` tables are exempt.

## fieldset-has-legend

A `<fieldset>` grouping related controls needs a `<legend>` naming the group.

## no-duplicate-main

`<main>` is the screen reader's "skip to content" target; duplicates make
landmark navigation ambiguous.

## no-outline-none

Removing the focus outline via inline `outline: none` (or `0`) on an interactive
element hides keyboard position unless a visible `:focus` style replaces it
(WCAG 2.4.7). With Tailwind, `outline-none` / `outline-hidden` is flagged unless
the element also carries a `focus:` / `focus-visible:` / `focus-within:` utility
(`focus-visible:ring-2`, `focus:outline-2`, …).

## accessible-authentication

WCAG 3.3.8 (new in 2.2): `autoComplete="off"` on a password field blocks
password managers, and `onPaste` may block paste — both force users to
transcribe credentials. Use `current-password` / `new-password`.

## error-identification

WCAG 3.3.1: a control marked `aria-invalid` must point at a text description via
`aria-describedby`/`aria-errormessage`, or screen reader users hear only
"invalid" with no explanation.

## no-autocomplete-off

WCAG 3.3.7 (new in 2.2): `autoComplete="off"` on identity fields (name, email,
phone, address…) forces users to re-enter data the browser could autofill, and
defeats 1.3.5.

## label-in-name

WCAG 2.5.3: the visible label must be contained in the accessible name, or
voice-control users saying the visible text cannot activate the control. Fires
only when both the `aria-label` and the entire visible text are static.

## pointer-cancellation

WCAG 2.5.2: triggering on `onMouseDown`/`onTouchStart` (with no up/click
counterpart) means users cannot abort by sliding off before releasing.

## color-contrast

Computes the WCAG 1.4.3 contrast ratio when the text color is statically known
— an inline literal or a Tailwind class (`text-gray-400`) — against the
background of the element or of the nearest ancestor with a known background.
Tailwind `dark:` variants and conditional class sets from `cn()` / `clsx()` are
checked separately; `disabled:` and `placeholder:` text is exempt. Custom
theme colors come from `tailwind.config.*`, CSS `@theme` blocks, or the
`tailwind.colors` config key. Dynamic styles, translucent colors and unknown
theme colors are skipped — *partial* coverage by design. See the
[Tailwind section of the native rules](native.md#tailwind-nativewind-and-uniwind)
for how classes are resolved; the same resolver runs on the web.

## target-size

Statically-sized interactive targets below 24px violate WCAG 2.5.8 (AA, new in
2.2) — reported as **serious**; between 24px and 44px is below the WCAG 2.5.5 /
Apple HIG / Material recommendation — reported as **minor**. Sizes come from
inline literals and Tailwind classes (`h-5 w-5`, `size-6`, `min-h-11`); a
single known dimension below the threshold is enough.

Each conditional class set is checked on its own — `secondary ? 'h-8 w-8' :
'size-11'` reports the 32px branch — and a `cva()` / `tv()` size table defined
in the same file is expanded, with an undersized variant reported once on its
definition. A set that lands in the same tier as the always-on style is not
restated. Not counted: a checkbox or radio whose `<label>` (wrapping or
`htmlFor`) or clickable row extends its activation area, and anything
visually hidden (`sr-only`, `opacity: 0`, `hidden`, `type="hidden"`).

## meaningful-order

Inline CSS `order` makes the visual sequence diverge from the DOM order that
screen readers and Tab follow (WCAG 1.3.2).

## Cross-file label resolution

`form-control-has-label` runs as a project-wide pass, not a per-file rule —
something jsx-a11y's per-file model can't do. It resolves every `<label htmlFor>`
(including design-system `<Label htmlFor>` components) against every control id
across the whole project, and reports ids that no label anywhere references.
This *reduces* false positives versus a per-file check: a control whose label
lives in another file is correctly passed. Any dynamic `htmlFor` in the project
disables the pass to stay false-positive-free. Skipped under `--changed`, which
sees only part of the project.
