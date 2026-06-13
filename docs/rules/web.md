# Web rules

Rules for React DOM, Next.js, Vite, Remix and any other React-based web framework.
Every rule maps to one or more [WCAG 2.2](https://www.w3.org/TR/WCAG22/) success criteria.

| Rule | Severity | WCAG |
| --- | --- | --- |
| [img-alt](#img-alt) | critical | 1.1.1 |
| [anchor-has-content](#anchor-has-content) | serious | 2.4.4, 4.1.2 |
| [anchor-is-valid](#anchor-is-valid) | serious | 2.1.1, 4.1.2 |
| [button-has-accessible-name](#button-has-accessible-name) | critical | 4.1.2 |
| [heading-has-content](#heading-has-content) | moderate | 1.3.1, 2.4.6 |
| [iframe-has-title](#iframe-has-title) | serious | 4.1.2 |
| [html-has-lang](#html-has-lang) | serious | 3.1.1 |
| [media-has-captions](#media-has-captions) | serious | 1.2.2 |
| [aria-attrs-valid](#aria-attrs-valid) | serious | 4.1.2 |
| [aria-role-valid](#aria-role-valid) | serious | 4.1.2 |
| [aria-required-attrs](#aria-required-attrs) | serious | 4.1.2 |
| [aria-hidden-focusable](#aria-hidden-focusable) | serious | 4.1.2, 1.3.1 |
| [no-redundant-roles](#no-redundant-roles) | minor | 4.1.2 |
| [scope-attr-valid](#scope-attr-valid) | minor | 1.3.1 |
| [no-static-element-interactions](#no-static-element-interactions) | serious | 2.1.1, 4.1.2 |
| [mouse-events-have-key-events](#mouse-events-have-key-events) | moderate | 2.1.1 |
| [no-positive-tabindex](#no-positive-tabindex) | serious | 2.4.3 |
| [no-autofocus](#no-autofocus) | moderate | 3.2.1 |
| [no-access-key](#no-access-key) | moderate | 2.1.1 |
| [no-distracting-elements](#no-distracting-elements) | serious | 2.2.2 |
| [form-control-has-label](#form-control-has-label) | serious | 1.3.1, 3.3.2, 4.1.2 |
| [lang-valid](#lang-valid) | serious | 3.1.1, 3.1.2 |
| [title-has-content](#title-has-content) | serious | 2.4.2 |
| [meta-viewport-zoomable](#meta-viewport-zoomable) | serious | 1.4.4 |
| [no-meta-refresh](#no-meta-refresh) | serious | 2.2.1 |
| [media-no-autoplay](#media-no-autoplay) | serious | 1.4.2 |
| [aria-attr-value-valid](#aria-attr-value-valid) | serious | 4.1.2 |
| [aria-required-context](#aria-required-context) | moderate | 1.3.1, 4.1.2 |
| [heading-order](#heading-order) | moderate | 1.3.1, 2.4.6 |
| [list-structure](#list-structure) | moderate | 1.3.1 |
| [table-has-header](#table-has-header) | moderate | 1.3.1 |
| [fieldset-has-legend](#fieldset-has-legend) | moderate | 1.3.1, 3.3.2 |
| [no-outline-none](#no-outline-none) | moderate | 2.4.7 |
| [autocomplete-valid](#autocomplete-valid) | moderate | 1.3.5 |
| [input-button-has-name](#input-button-has-name) | serious | 4.1.2, 1.1.1 |
| [accessible-authentication](#accessible-authentication) | serious | 3.3.8 |
| [color-contrast](#color-contrast) | serious | 1.4.3 |
| [target-size](#target-size) | serious | 2.5.8, 2.5.5 |
| [label-in-name](#label-in-name) | moderate | 2.5.3 |
| [pointer-cancellation](#pointer-cancellation) | moderate | 2.5.2 |
| [error-identification](#error-identification) | moderate | 3.3.1 |
| [no-autocomplete-off](#no-autocomplete-off) | moderate | 3.3.7, 1.3.5 |
| [meaningful-order](#meaningful-order) | minor | 1.3.2, 2.4.3 |

## img-alt

`<img>`, `<area>` and Next.js `<Image>` must have an `alt` attribute. `alt=""`
is valid for decorative images. Filename alts (`alt="hero.png"`) and redundant
phrasing (`alt="picture of a dog"`) are flagged.

```tsx
// ✖
<img src="/hero.png" />
<img src="/logo.svg" alt="logo.svg" />

// ✔
<img src="/hero.png" alt="A mountain trail at sunrise" />
<img src="/divider.svg" alt="" />
```

## anchor-has-content

Links must have a discernible name: text content, `aria-label`, or an image with alt text.

## anchor-is-valid

`<a>` without `href` is not keyboard focusable; `href="#"` and `javascript:` URLs
are not destinations. Use `<button>` for actions.

```tsx
// ✖
<a onClick={openModal}>Settings</a>

// ✔
<button type="button" onClick={openModal}>Settings</button>
```

## button-has-accessible-name

Buttons (and `role="button"` elements) need a name. Icon-only buttons need `aria-label`.

## heading-has-content

Empty `<h1>`–`<h6>` confuse screen reader document navigation.

## iframe-has-title

Frames need a `title` describing their content.

## html-has-lang

`<html>` (or Next.js `<Html>` in `_document`) must declare `lang` so screen
readers pick the right speech synthesizer.

## media-has-captions

`<video>`/`<audio>` need a `<track kind="captions">`. Muted media is exempt.

## aria-attrs-valid

Every `aria-*` attribute must exist in ARIA 1.2 with correct lowercase casing.
Catches typos like `aria-lable` that fail silently at runtime.

## aria-role-valid

`role` values must be real, non-abstract ARIA roles.

## aria-required-attrs

Roles such as `checkbox`, `slider` and `combobox` have required states the
author must provide (e.g. `aria-checked`).

## aria-hidden-focusable

`aria-hidden="true"` on a focusable element creates a tab stop screen readers
cannot announce. Add `tabIndex={-1}` or remove `aria-hidden`.

## no-redundant-roles

`<button role="button">` is noise — the implicit role already applies.

## scope-attr-valid

`scope` only works on `<th>`.

## no-static-element-interactions

A `<div onClick>` is invisible to keyboard and screen reader users. Either use
a native `<button>`/`<a>`, or add an interactive role, `tabIndex={0}` and a
keyboard handler.

## mouse-events-have-key-events

`onMouseOver`/`onMouseOut` must be paired with `onFocus`/`onBlur`.

## no-positive-tabindex

`tabIndex` greater than zero hijacks the page tab order.

## no-autofocus

Unexpected focus moves disorient screen reader and magnification users.

## no-access-key

`accessKey` conflicts with screen reader and OS shortcuts.

## no-distracting-elements

`<marquee>` and `<blink>` cannot be paused (WCAG 2.2.2).

## form-control-has-label

Inputs, selects and textareas need a programmatic label: `<label htmlFor>`, a
wrapping `<label>`, or `aria-label`. Placeholders are not labels. An `id` is
given the benefit of the doubt since the matching `<label htmlFor>` may live in
another file.

## lang-valid

`lang` values must be well-formed BCP 47 tags (`en`, `en-US`, `hi`) on `<html>`
(3.1.1) and on elements marking foreign-language passages (3.1.2).

## title-has-content

An empty `<title>` leaves the page unnamed in tabs, bookmarks, history and
screen reader announcements.

## meta-viewport-zoomable

`user-scalable=no` or `maximum-scale` below 2 prevents low-vision users from
zooming; WCAG requires text resizable to 200%.

## no-meta-refresh

`<meta http-equiv="refresh">` reloads or redirects on a timer users cannot
adjust or disable.

## media-no-autoplay

Auto-playing audio talks over screen readers. Muted autoplay is fine; with
controls present, the finding is downgraded to moderate.

## aria-attr-value-valid

Enumerated ARIA attributes (`aria-live`, `aria-checked`, `aria-current`, …)
must use their allowed tokens, and numeric ones (`aria-level`,
`aria-valuenow`, …) must be numbers — invalid values are silently ignored.

## aria-required-context

Roles like `tab`, `option`, `menuitem` and `listitem` only work inside their
required parent role. Only flagged when the entire ancestor chain in the file
is plain DOM, so composition through components never false-positives.

## heading-order

Skipped levels (`h2` → `h4`) break heading navigation. Because files are
fragments, only relative skips within a file are flagged — a component that
starts at `h3` is fine.

## list-structure

`<ul>`/`<ol>` may only contain `<li>` (plus script/template); a stray `<div>`
wrapper makes screen readers misreport list size. `<li>` outside a list loses
its semantics entirely.

## table-has-header

A table with `<td>` data but no `<th>` (or `columnheader`/`rowheader` roles)
gives screen reader users no row/column context. Layout tables
(`role="presentation"`) and dynamically built tables are skipped.

## fieldset-has-legend

A `<fieldset>` without `<legend>` announces its controls without the group
name — critical for radio groups.

## no-outline-none

Inline `outline: 'none'` on an interactive element hides keyboard focus
position unless a visible `:focus` replacement exists.

## autocomplete-valid

`autoComplete` must use real WHATWG autofill tokens; invalid tokens mean the
input purpose stays unidentifiable to assistive technology (1.3.5).

## input-button-has-name

`<input type="button">` has no default label and needs `value` or
`aria-label`; `<input type="image">` needs `alt`.

## accessible-authentication

New in WCAG 2.2: `autoComplete="off"` on password fields blocks password
managers, forcing transcription; `onPaste` handlers are flagged for review in
case they block pasting.

## color-contrast

Computes the WCAG contrast ratio when `color` and `backgroundColor` are both
inline literals (hex, rgb(), common named colors). Below 3:1 is serious;
3:1–4.5:1 is flagged only when the font size is known to be small, so
possibly-large text never false-positives. Dynamic styles, CSS classes and
translucent colors are out of static reach — *partial* coverage of 1.4.3.

## target-size

Interactive elements with inline sizes below 24×24px violate WCAG 2.5.8
(AA, new in 2.2); below 44×44px is a minor note (2.5.5 AAA).

## label-in-name

When the `aria-label` and the visible text are both static, the label must
contain the text — voice-control users activate controls by saying what they
see (2.5.3).

## pointer-cancellation

`onMouseDown`/`onTouchStart` as the only activation means users cannot abort
by sliding off before release; actions belong on click/up events (2.5.2).

## error-identification

A control marked `aria-invalid` must reference an error description via
`aria-describedby`/`aria-errormessage`, or screen readers announce "invalid"
with no explanation (3.3.1).

## no-autocomplete-off

`autoComplete="off"` on personal-data fields (email, tel, name, address…)
forces users to re-enter information (3.3.7, new in 2.2) and defeats input
purpose identification (1.3.5).

## meaningful-order

Inline CSS `order` makes the visual sequence diverge from the DOM order that
screen readers and Tab follow (1.3.2).
