import { describe, expect, it } from 'vitest';
import { analyze, applyFixes, buildFileModel, parseSource } from '@react-a11y/core';
import { createLabelForPass, webRules } from '@react-a11y/rules-web';

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

describe('autofixes', () => {
  it('fixes aria casing and redundant roles', () => {
    const code = `const x = <nav role="navigation" aria-Label="Main" />;`;
    const diags = analyze({ code, filename: 'test.tsx', platform: 'web', rules: webRules });
    const fixes = diags.filter((d) => d.fix).map((d) => d.fix!);
    expect(fixes.length).toBe(2);
    const { output } = applyFixes(code, fixes);
    expect(output).toBe(`const x = <nav aria-label="Main" />;`);
  });
});

describe('cross-file label resolution', () => {
  const collectInto = (pass: ReturnType<typeof createLabelForPass>, code: string, filename: string) =>
    pass.collect(buildFileModel(parseSource(code, filename)), filename);

  it('flags ids never referenced by a label anywhere in the project', () => {
    const pass = createLabelForPass();
    collectInto(pass, `const a = <input type="email" id="email" />;`, 'SignUp.tsx');
    collectInto(pass, `const b = <label htmlFor="username">Username</label>;`, 'Labels.tsx');
    const diags = pass.finalize();
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({ ruleId: 'form-control-has-label', file: 'SignUp.tsx' });
  });

  it('resolves labels across files and stays quiet on dynamic htmlFor', () => {
    const resolved = createLabelForPass();
    collectInto(resolved, `const a = <input type="email" id="email" />;`, 'SignUp.tsx');
    collectInto(resolved, `const b = <label htmlFor="email">Email</label>;`, 'Labels.tsx');
    expect(resolved.finalize()).toHaveLength(0);

    const dynamic = createLabelForPass();
    collectInto(dynamic, `const a = <input type="email" id="email" />;`, 'SignUp.tsx');
    collectInto(dynamic, `const b = <label htmlFor={fieldId}>Email</label>;`, 'Field.tsx');
    expect(dynamic.finalize()).toHaveLength(0);
  });

  it('credits htmlFor on design-system Label components', () => {
    const pass = createLabelForPass();
    collectInto(pass, `const a = <input type="email" id="email" />;`, 'SignUp.tsx');
    collectInto(pass, `const b = <Label htmlFor="email">Email</Label>;`, 'Field.tsx');
    expect(pass.finalize()).toHaveLength(0);
  });

  it('respects the rule being turned off', () => {
    const pass = createLabelForPass({ 'form-control-has-label': 'off' });
    collectInto(pass, `const a = <input type="email" id="email" />;`, 'SignUp.tsx');
    expect(pass.finalize()).toHaveLength(0);
  });
});

describe('landmarks', () => {
  it('no-duplicate-main', () => {
    expect(run(`<div><main>a</main><main>b</main></div>`)).toContain('no-duplicate-main');
    expect(run(`<div><main>a</main></div>`)).not.toContain('no-duplicate-main');
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

describe('contrast, label-in-name, pointer and order', () => {
  it('color-contrast', () => {
    expect(run(`<p style={{ color: '#999999', backgroundColor: '#ffffff', fontSize: 14 }}>Low</p>`)).toContain('color-contrast');
    expect(run(`<p style={{ color: '#777777', backgroundColor: '#888888' }}>Bad</p>`)).toContain('color-contrast');
    expect(run(`<p style={{ color: '#000000', backgroundColor: '#ffffff' }}>Fine</p>`)).not.toContain('color-contrast');
    expect(run(`<p style={{ color: '#8a8a8a', backgroundColor: '#ffffff', fontSize: 14 }}>Small text needs 4.5</p>`)).toContain('color-contrast');
    expect(run(`<p style={{ color: '#8a8a8a', backgroundColor: '#ffffff', fontSize: 28 }}>Large ok at 3:1+</p>`)).not.toContain('color-contrast');
    expect(run(`<p style={{ color: theme.fg, backgroundColor: '#ffffff' }}>Dynamic</p>`)).not.toContain('color-contrast');
  });
  it('target-size', () => {
    expect(run(`<button style={{ width: 16, height: 16 }} aria-label="Close">x</button>`)).toContain('target-size');
    expect(run(`<button style={{ width: 48, height: 48 }} aria-label="Close">x</button>`)).not.toContain('target-size');
  });
  it('label-in-name', () => {
    expect(run(`<button aria-label="Submit form">Send</button>`)).toContain('label-in-name');
    expect(run(`<button aria-label="Send message now">Send</button>`)).not.toContain('label-in-name');
    expect(run(`<button aria-label="Close">{label}</button>`)).not.toContain('label-in-name');
  });
  it('pointer-cancellation', () => {
    expect(run(`<button onMouseDown={fire}>Fire</button>`)).toContain('pointer-cancellation');
    expect(run(`<button onMouseDown={prime} onClick={fire}>Fire</button>`)).not.toContain('pointer-cancellation');
  });
  it('meaningful-order', () => {
    expect(run(`<div style={{ order: 2 }}>Second?</div>`)).toContain('meaningful-order');
    expect(run(`<div style={{ order: 0 }}>Normal</div>`)).not.toContain('meaningful-order');
  });
  it('error-identification and no-autocomplete-off', () => {
    expect(run(`<input id="e" aria-invalid={hasError} />`)).toContain('error-identification');
    expect(run(`<input id="e" aria-invalid={hasError} aria-describedby="e-err" />`)).not.toContain('error-identification');
    expect(run(`<input id="e" type="email" autoComplete="off" />`)).toContain('no-autocomplete-off');
    expect(run(`<input id="q" type="search" name="query" autoComplete="off" />`)).not.toContain('no-autocomplete-off');
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

describe('role semantics', () => {
  it('interactive-supports-focus', () => {
    expect(run(`<div role="button" onClick={f}>Go</div>`)).toContain('interactive-supports-focus');
    expect(run(`<div role="button" tabIndex={0} onClick={f} onKeyDown={f}>Go</div>`)).not.toContain('interactive-supports-focus');
    expect(run(`<div role="article" onClick={f}>Go</div>`)).not.toContain('interactive-supports-focus');
  });

  it('no-noninteractive-element-interactions', () => {
    expect(run(`<li onClick={f}>Item</li>`)).toContain('no-noninteractive-element-interactions');
    expect(run(`<main onClick={f}>Body</main>`)).toContain('no-noninteractive-element-interactions');
    expect(run(`<li role="menuitem" onClick={f} onKeyDown={f} tabIndex={0}>Item</li>`)).not.toContain('no-noninteractive-element-interactions');
    expect(run(`<div onClick={f}>generic</div>`)).not.toContain('no-noninteractive-element-interactions');
  });

  it('no-interactive-element-to-noninteractive-role', () => {
    expect(run(`<button role="article">x</button>`)).toContain('no-interactive-element-to-noninteractive-role');
    expect(run(`<a href="/x" role="presentation">x</a>`)).toContain('no-interactive-element-to-noninteractive-role');
    expect(run(`<button role="tab">x</button>`)).not.toContain('no-interactive-element-to-noninteractive-role');
    expect(run(`<div role="article">x</div>`)).not.toContain('no-interactive-element-to-noninteractive-role');
  });

  it('no-noninteractive-element-to-interactive-role', () => {
    expect(run(`<li role="button">x</li>`)).toContain('no-noninteractive-element-to-interactive-role');
    expect(run(`<main role="tab">x</main>`)).toContain('no-noninteractive-element-to-interactive-role');
    expect(run(`<div role="button">x</div>`)).not.toContain('no-noninteractive-element-to-interactive-role');
    expect(run(`<li role="listitem">x</li>`)).not.toContain('no-noninteractive-element-to-interactive-role');
  });

  it('no-noninteractive-tabindex', () => {
    expect(run(`<li tabIndex={0}>x</li>`)).toContain('no-noninteractive-tabindex');
    expect(run(`<main tabIndex={0}>x</main>`)).toContain('no-noninteractive-tabindex');
    expect(run(`<div tabIndex={0}>x</div>`)).not.toContain('no-noninteractive-tabindex');
    expect(run(`<li role="menuitem" tabIndex={0}>x</li>`)).not.toContain('no-noninteractive-tabindex');
    expect(run(`<input tabIndex={0} id="a" />`)).not.toContain('no-noninteractive-tabindex');
  });

  it('prefer-tag-over-role', () => {
    expect(run(`<div role="button">x</div>`)).toContain('prefer-tag-over-role');
    expect(run(`<span role="navigation">x</span>`)).toContain('prefer-tag-over-role');
    expect(run(`<button role="button">x</button>`)).not.toContain('prefer-tag-over-role');
    expect(run(`<div role="tabpanel">x</div>`)).not.toContain('prefer-tag-over-role');
  });
});

describe('keyboard and aria support', () => {
  it('click-events-have-key-events', () => {
    expect(run(`<div onClick={f}>x</div>`)).toContain('click-events-have-key-events');
    expect(run(`<div onClick={f} onKeyDown={f}>x</div>`)).not.toContain('click-events-have-key-events');
    expect(run(`<button onClick={f}>x</button>`)).not.toContain('click-events-have-key-events');
  });

  it('role-supports-aria-props', () => {
    expect(run(`<div role="menuitem" aria-selected="true" />`)).toContain('role-supports-aria-props');
    expect(run(`<div role="link" aria-checked="true" />`)).toContain('role-supports-aria-props');
    expect(run(`<div role="checkbox" aria-checked="true" tabIndex={0} onClick={f} onKeyDown={f} />`)).not.toContain('role-supports-aria-props');
    expect(run(`<div role="link" aria-label="Home" />`)).not.toContain('role-supports-aria-props');
  });

  it('aria-unsupported-elements', () => {
    expect(run(`<meta name="x" content="y" aria-hidden="true" />`)).toContain('aria-unsupported-elements');
    expect(run(`<html role="main"><body /></html>`)).toContain('aria-unsupported-elements');
    expect(run(`<div aria-hidden="true" />`)).not.toContain('aria-unsupported-elements');
    const diags = analyze({ code: `const x = <meta content="y" aria-hidden="true" />;`, filename: 'test.tsx', platform: 'web', rules: webRules });
    const fix = diags.find((d) => d.ruleId === 'aria-unsupported-elements')?.fix;
    expect(fix).toBeDefined();
  });

  it('aria-activedescendant-has-tabindex', () => {
    expect(run(`<div role="combobox" aria-activedescendant="opt-1" aria-expanded="true" />`)).toContain('aria-activedescendant-has-tabindex');
    expect(run(`<div tabIndex={0} aria-activedescendant="opt-1" />`)).not.toContain('aria-activedescendant-has-tabindex');
    expect(run(`<input id="a" aria-activedescendant="opt-1" />`)).not.toContain('aria-activedescendant-has-tabindex');
  });

  it('anchor-ambiguous-text', () => {
    expect(run(`<a href="/x">Click here</a>`)).toContain('anchor-ambiguous-text');
    expect(run(`<a href="/x">Read more</a>`)).toContain('anchor-ambiguous-text');
    expect(run(`<a href="/x">Download the 2024 report</a>`)).not.toContain('anchor-ambiguous-text');
    expect(run(`<a href="/x" aria-label="Download the 2024 report">Read more</a>`)).not.toContain('anchor-ambiguous-text');
    expect(run(`<a href="/x">{label}</a>`)).not.toContain('anchor-ambiguous-text');
  });

  it('img-alt also flags standalone redundant words', () => {
    expect(run(`<img src="/a.png" alt="Profile photo" />`)).toContain('img-alt');
    expect(run(`<img src="/a.png" alt="A golden retriever" />`)).not.toContain('img-alt');
  });
});
