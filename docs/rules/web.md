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
