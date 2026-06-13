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

describe('forms', () => {
  it('form-control-has-label', () => {
    expect(run(`<input type="email" placeholder="Email" />`)).toContain('form-control-has-label');
    expect(run(`<input type="email" id="email" />`)).not.toContain('form-control-has-label');
    expect(run(`<input type="email" aria-label="Email" />`)).not.toContain('form-control-has-label');
    expect(run(`<label>Email<input type="email" /></label>`)).not.toContain('form-control-has-label');
    expect(run(`<input type="hidden" name="csrf" />`)).not.toContain('form-control-has-label');
  });
  it('anchor-is-valid', () => {
    expect(run(`<a onClick={f}>Do thing</a>`)).toContain('anchor-is-valid');
    expect(run(`<a href="#" onClick={f}>Do thing</a>`)).toContain('anchor-is-valid');
    expect(run(`<a href="javascript:void(0)">Do thing</a>`)).toContain('anchor-is-valid');
    expect(run(`<a href="/docs">Docs</a>`)).not.toContain('anchor-is-valid');
  });
});
