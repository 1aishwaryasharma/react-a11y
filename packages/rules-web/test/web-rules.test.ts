import { describe, expect, it } from 'vitest';
import { analyze } from '@react-a11y/core';
import { webRules } from '@react-a11y/rules-web';

function run(code: string): string[] {
  return analyze({ code, filename: 'test.tsx', platform: 'web', rules: webRules }).map((d) => d.ruleId);
}

describe('img-alt', () => {
  it('flags missing alt, filename alt and redundant alt', () => {
    expect(run(`<img src="/a.png" />`)).toContain('img-alt');
    expect(run(`<img src="/a.png" alt="hero.png" />`)).toContain('img-alt');
    expect(run(`<img src="/a.png" alt="picture of a dog" />`)).toContain('img-alt');
  });
  it('accepts good, decorative, dynamic and spread alts', () => {
    expect(run(`<img src="/a.png" alt="A golden retriever" />`)).not.toContain('img-alt');
    expect(run(`<img src="/a.png" alt="" />`)).not.toContain('img-alt');
    expect(run(`<img src="/a.png" alt={altText} />`)).not.toContain('img-alt');
    expect(run(`<img {...props} />`)).not.toContain('img-alt');
    expect(run(`<img src="/a.png" aria-hidden="true" />`)).not.toContain('img-alt');
  });
  it('covers next/image', () => {
    expect(run(`import Image from 'next/image';\nconst x = <Image src="/a.png" />;`)).toContain('img-alt');
  });
});

describe('names and content', () => {
  it('anchor-has-content', () => {
    expect(run(`<a href="/about"></a>`)).toContain('anchor-has-content');
    expect(run(`<a href="/about">About</a>`)).not.toContain('anchor-has-content');
    expect(run(`<a href="/about"><img src="/a.png" alt="About us" /></a>`)).not.toContain('anchor-has-content');
    expect(run(`<a href="/about" aria-label="About" />`)).not.toContain('anchor-has-content');
  });
  it('button-has-accessible-name', () => {
    expect(run(`<button onClick={f}><svg aria-hidden="true" /></button>`)).toContain('button-has-accessible-name');
    expect(run(`<button aria-label="Close" onClick={f}><svg aria-hidden="true" /></button>`)).not.toContain('button-has-accessible-name');
    expect(run(`<button>{label}</button>`)).not.toContain('button-has-accessible-name');
  });
  it('heading-has-content, iframe-title, html-lang', () => {
    expect(run(`<h2></h2>`)).toContain('heading-has-content');
    expect(run(`<iframe src="https://x.com" />`)).toContain('iframe-has-title');
    expect(run(`<html><body /></html>`)).toContain('html-has-lang');
    expect(run(`<html lang="en"><body /></html>`)).not.toContain('html-has-lang');
  });
  it('media-has-captions', () => {
    expect(run(`<video src="/v.mp4" controls />`)).toContain('media-has-captions');
    expect(run(`<video controls><source src="/v.mp4" /><track kind="captions" src="/c.vtt" /></video>`)).not.toContain('media-has-captions');
    expect(run(`<video src="/bg.mp4" muted />`)).not.toContain('media-has-captions');
  });
});

describe('aria', () => {
  it('validates attribute names and casing', () => {
    expect(run(`<div aria-lable="oops" />`)).toContain('aria-attrs-valid');
    expect(run(`<div aria-Label="oops" />`)).toContain('aria-attrs-valid');
    expect(run(`<div aria-label="fine" />`)).not.toContain('aria-attrs-valid');
  });
  it('validates roles', () => {
    expect(run(`<div role="buton" />`)).toContain('aria-role-valid');
    expect(run(`<div role="widget" />`)).toContain('aria-role-valid');
    expect(run(`<div role="button" tabIndex={0} onKeyDown={f} onClick={f} />`)).not.toContain('aria-role-valid');
  });
  it('requires role-mandated attributes', () => {
    expect(run(`<div role="checkbox" tabIndex={0} onClick={f} onKeyDown={f} />`)).toContain('aria-required-attrs');
    expect(run(`<div role="checkbox" aria-checked={checked} tabIndex={0} onClick={f} onKeyDown={f} />`)).not.toContain('aria-required-attrs');
  });
  it('flags aria-hidden on focusable elements', () => {
    expect(run(`<button aria-hidden="true">x</button>`)).toContain('aria-hidden-focusable');
    expect(run(`<button aria-hidden="true" tabIndex={-1}>x</button>`)).not.toContain('aria-hidden-focusable');
    expect(run(`<div aria-hidden="true">x</div>`)).not.toContain('aria-hidden-focusable');
  });
  it('flags redundant roles and misplaced scope', () => {
    expect(run(`<button role="button">x</button>`)).toContain('no-redundant-roles');
    expect(run(`<td scope="row">x</td>`)).toContain('scope-attr-valid');
    expect(run(`<th scope="row">x</th>`)).not.toContain('scope-attr-valid');
  });
});

describe('interactions', () => {
  it('no-static-element-interactions', () => {
    expect(run(`<div onClick={f}>Click me</div>`)).toContain('no-static-element-interactions');
    expect(run(`<div role="button" tabIndex={0} onClick={f} onKeyDown={f}>ok</div>`)).not.toContain('no-static-element-interactions');
    expect(run(`<button onClick={f}>ok</button>`)).not.toContain('no-static-element-interactions');
  });
  it('mouse/key pairing, tabindex, autofocus, accesskey, marquee', () => {
    expect(run(`<div onMouseOver={f} />`)).toContain('mouse-events-have-key-events');
    expect(run(`<div onMouseOver={f} onFocus={f} />`)).not.toContain('mouse-events-have-key-events');
    expect(run(`<input tabIndex={3} id="a" />`)).toContain('no-positive-tabindex');
    expect(run(`<input autoFocus id="a" />`)).toContain('no-autofocus');
    expect(run(`<button accessKey="s">Save</button>`)).toContain('no-access-key');
    expect(run(`<marquee>hi</marquee>`)).toContain('no-distracting-elements');
  });
});

describe('document', () => {
  it('lang-valid', () => {
    expect(run(`<html lang="english"><body /></html>`)).toContain('lang-valid');
    expect(run(`<span lang="x!">hi</span>`)).toContain('lang-valid');
    expect(run(`<html lang="en-US"><body /></html>`)).not.toContain('lang-valid');
    expect(run(`<span lang="hi">नमस्ते</span>`)).not.toContain('lang-valid');
  });
  it('meta-viewport-zoomable', () => {
    expect(run(`<meta name="viewport" content="width=device-width, user-scalable=no" />`)).toContain('meta-viewport-zoomable');
    expect(run(`<meta name="viewport" content="width=device-width, maximum-scale=1" />`)).toContain('meta-viewport-zoomable');
    expect(run(`<meta name="viewport" content="width=device-width, initial-scale=1" />`)).not.toContain('meta-viewport-zoomable');
  });
  it('no-meta-refresh and title-has-content', () => {
    expect(run(`<meta httpEquiv="refresh" content="5;url=/next" />`)).toContain('no-meta-refresh');
    expect(run(`<title></title>`)).toContain('title-has-content');
    expect(run(`<title>Dashboard</title>`)).not.toContain('title-has-content');
    expect(run(`<title>{pageTitle}</title>`)).not.toContain('title-has-content');
  });
});

describe('structure', () => {
  it('heading-order flags skips but allows non-h1 starts', () => {
    expect(run(`<div><h2>A</h2><h4>B</h4></div>`)).toContain('heading-order');
    expect(run(`<div><h3>A</h3><h4>B</h4><h2>C</h2></div>`)).not.toContain('heading-order');
  });
  it('list-structure', () => {
    expect(run(`<ul><div>item</div></ul>`)).toContain('list-structure');
    expect(run(`<div><li>loose</li></div>`)).toContain('list-structure');
    expect(run(`<ul><li>a</li>{items.map(i => <li key={i}>{i}</li>)}</ul>`)).not.toContain('list-structure');
    expect(run(`<ul><Item /></ul>`)).not.toContain('list-structure');
  });
  it('table-has-header', () => {
    expect(run(`<table><tbody><tr><td>1</td></tr></tbody></table>`)).toContain('table-has-header');
    expect(run(`<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>`)).not.toContain('table-has-header');
    expect(run(`<table role="presentation"><tbody><tr><td>1</td></tr></tbody></table>`)).not.toContain('table-has-header');
    expect(run(`<table><tbody>{rows}</tbody></table>`)).not.toContain('table-has-header');
  });
  it('fieldset-has-legend', () => {
    expect(run(`<fieldset><input id="a" /></fieldset>`)).toContain('fieldset-has-legend');
    expect(run(`<fieldset><legend>Shipping</legend><input id="a" /></fieldset>`)).not.toContain('fieldset-has-legend');
  });
  it('aria-required-context', () => {
    expect(run(`<div><div role="tab">Tab</div></div>`)).toContain('aria-required-context');
    expect(run(`<div role="tablist"><div role="tab" aria-checked={false}>Tab</div></div>`)).not.toContain('aria-required-context');
    expect(run(`<div role="tab">Tab</div>`)).not.toContain('aria-required-context'); // file root
    expect(run(`<Tabs><div role="tab">Tab</div></Tabs>`)).not.toContain('aria-required-context'); // component ancestor
    expect(run(`<ul><div role="listitem">x</div></ul>`)).not.toContain('aria-required-context'); // implicit list
  });
});

describe('aria values', () => {
  it('aria-attr-value-valid', () => {
    expect(run(`<div aria-live="rude" />`)).toContain('aria-attr-value-valid');
    expect(run(`<div role="checkbox" aria-checked="yes" tabIndex={0} onClick={f} onKeyDown={f} />`)).toContain('aria-attr-value-valid');
    expect(run(`<div aria-level="first" role="heading">x</div>`)).toContain('aria-attr-value-valid');
    expect(run(`<div aria-live="polite" />`)).not.toContain('aria-attr-value-valid');
    expect(run(`<div aria-hidden="true" />`)).not.toContain('aria-attr-value-valid');
    expect(run(`<div aria-checked={isChecked} role="checkbox" tabIndex={0} onClick={f} onKeyDown={f} />`)).not.toContain('aria-attr-value-valid');
  });
});

describe('focus and media', () => {
  it('no-outline-none', () => {
    expect(run(`<button style={{ outline: 'none' }}>Save</button>`)).toContain('no-outline-none');
    expect(run(`<div style={{ outline: 'none' }}>text</div>`)).not.toContain('no-outline-none');
    expect(run(`<button style={{ color: 'red' }}>Save</button>`)).not.toContain('no-outline-none');
  });
  it('media-no-autoplay', () => {
    expect(run(`<video src="/v.mp4" autoPlay><track kind="captions" src="/c.vtt" /></video>`)).toContain('media-no-autoplay');
    expect(run(`<video src="/bg.mp4" autoPlay muted />`)).not.toContain('media-no-autoplay');
  });
});

describe('forms', () => {
  it('form-control-has-label', () => {
    expect(run(`<input type="email" placeholder="Email" />`)).toContain('form-control-has-label');
    expect(run(`<input type="email" id="email" />`)).not.toContain('form-control-has-label');
    expect(run(`<input type="email" aria-label="Email" />`)).not.toContain('form-control-has-label');
    expect(run(`<label>Email<input type="email" /></label>`)).not.toContain('form-control-has-label');
    expect(run(`<input type="hidden" name="csrf" />`)).not.toContain('form-control-has-label');
  });
  it('autocomplete-valid', () => {
    expect(run(`<input id="e" autoComplete="emial" />`)).toContain('autocomplete-valid');
    expect(run(`<input id="e" autoComplete="email" />`)).not.toContain('autocomplete-valid');
    expect(run(`<input id="e" autoComplete="section-blue shipping street-address" />`)).not.toContain('autocomplete-valid');
  });
  it('input-button-has-name', () => {
    expect(run(`<input type="button" onClick={f} />`)).toContain('input-button-has-name');
    expect(run(`<input type="image" src="/go.png" />`)).toContain('input-button-has-name');
    expect(run(`<input type="button" value="Save" />`)).not.toContain('input-button-has-name');
    expect(run(`<input type="submit" />`)).not.toContain('input-button-has-name');
  });
  it('accessible-authentication', () => {
    expect(run(`<input type="password" id="pw" autoComplete="off" />`)).toContain('accessible-authentication');
    expect(run(`<input type="password" id="pw" onPaste={block} autoComplete="current-password" />`)).toContain('accessible-authentication');
    expect(run(`<input type="password" id="pw" autoComplete="current-password" />`)).not.toContain('accessible-authentication');
  });
  it('anchor-is-valid', () => {
    expect(run(`<a onClick={f}>Do thing</a>`)).toContain('anchor-is-valid');
    expect(run(`<a href="#" onClick={f}>Do thing</a>`)).toContain('anchor-is-valid');
    expect(run(`<a href="javascript:void(0)">Do thing</a>`)).toContain('anchor-is-valid');
    expect(run(`<a href="/docs">Docs</a>`)).not.toContain('anchor-is-valid');
  });
});
