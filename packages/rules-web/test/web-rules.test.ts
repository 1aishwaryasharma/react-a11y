import { describe, expect, it } from 'vitest';
import { analyze, buildFileModel, parseSource } from '@react-a11y/core';
import { createLabelForPass, webRules } from '@react-a11y/rules-web';

function run(code: string): string[] {
  return analyze({ code, filename: 'test.tsx', platform: 'web', rules: webRules }).map((d) => d.ruleId);
}

describe('the web pack is the jsx-a11y complement', () => {
  it('keeps the unique WCAG 2.2 / structure rules', () => {
    const ids = webRules.map((r) => r.meta.id);
    expect(ids).toEqual(expect.arrayContaining([
      'color-contrast', 'target-size', 'label-in-name', 'pointer-cancellation',
      'heading-order', 'list-structure', 'table-has-header', 'fieldset-has-legend',
      'no-duplicate-main', 'meta-viewport-zoomable', 'no-meta-refresh', 'title-has-content',
      'no-outline-none', 'aria-required-context', 'accessible-authentication',
      'error-identification', 'no-autocomplete-off', 'media-no-autoplay',
      'button-has-accessible-name', 'input-button-has-name', 'meaningful-order',
    ]));
  });

  it('does NOT re-implement rules jsx-a11y already covers', () => {
    const ids = webRules.map((r) => r.meta.id);
    for (const deferred of ['img-alt', 'aria-attrs-valid', 'anchor-is-valid', 'no-static-element-interactions', 'role-supports-aria-props']) {
      expect(ids).not.toContain(deferred);
    }
  });

  it('registers form-control-has-label (project pass) but does not fire it per-file', () => {
    // Listed so --list-rules / --coverage / config see it...
    expect(webRules.map((r) => r.meta.id)).toContain('form-control-has-label');
    // ...but the per-file visitor is empty; the cross-file pass does the work.
    expect(run(`<input type="email" id="email" />`)).not.toContain('form-control-has-label');
  });
});

describe('names', () => {
  it('button-has-accessible-name', () => {
    expect(run(`<button onClick={f}><svg aria-hidden="true" /></button>`)).toContain('button-has-accessible-name');
    expect(run(`<button aria-label="Close" onClick={f}><svg aria-hidden="true" /></button>`)).not.toContain('button-has-accessible-name');
    expect(run(`<button>{label}</button>`)).not.toContain('button-has-accessible-name');
  });
  it('input-button-has-name', () => {
    expect(run(`<input type="button" onClick={f} />`)).toContain('input-button-has-name');
    expect(run(`<input type="image" src="/go.png" />`)).toContain('input-button-has-name');
    expect(run(`<input type="button" value="Save" />`)).not.toContain('input-button-has-name');
    expect(run(`<input type="submit" />`)).not.toContain('input-button-has-name');
  });
  it('label-in-name', () => {
    expect(run(`<button aria-label="Submit form">Send</button>`)).toContain('label-in-name');
    expect(run(`<button aria-label="Send message now">Send</button>`)).not.toContain('label-in-name');
    expect(run(`<button aria-label="Close">{label}</button>`)).not.toContain('label-in-name');
  });
});

describe('document', () => {
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
  it('media-no-autoplay', () => {
    expect(run(`<video src="/v.mp4" autoPlay><track kind="captions" src="/c.vtt" /></video>`)).toContain('media-no-autoplay');
    expect(run(`<video src="/bg.mp4" autoPlay muted />`)).not.toContain('media-no-autoplay');
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
  it('no-duplicate-main', () => {
    expect(run(`<div><main>a</main><main>b</main></div>`)).toContain('no-duplicate-main');
    expect(run(`<div><main>a</main></div>`)).not.toContain('no-duplicate-main');
  });
});

describe('contrast, target size, pointer, order', () => {
  it('color-contrast', () => {
    expect(run(`<p style={{ color: '#999999', backgroundColor: '#ffffff', fontSize: 14 }}>Low</p>`)).toContain('color-contrast');
    expect(run(`<p style={{ color: '#777777', backgroundColor: '#888888' }}>Bad</p>`)).toContain('color-contrast');
    expect(run(`<p style={{ color: '#000000', backgroundColor: '#ffffff' }}>Fine</p>`)).not.toContain('color-contrast');
    expect(run(`<p style={{ color: '#8a8a8a', backgroundColor: '#ffffff', fontSize: 28 }}>Large ok at 3:1+</p>`)).not.toContain('color-contrast');
    expect(run(`<p style={{ color: theme.fg, backgroundColor: '#ffffff' }}>Dynamic</p>`)).not.toContain('color-contrast');
  });
  it('target-size', () => {
    expect(run(`<button style={{ width: 16, height: 16 }} aria-label="Close">x</button>`)).toContain('target-size');
    expect(run(`<button style={{ width: 48, height: 48 }} aria-label="Close">x</button>`)).not.toContain('target-size');
  });
  it('pointer-cancellation', () => {
    expect(run(`<button onMouseDown={fire}>Fire</button>`)).toContain('pointer-cancellation');
    expect(run(`<button onMouseDown={prime} onClick={fire}>Fire</button>`)).not.toContain('pointer-cancellation');
  });
  it('meaningful-order', () => {
    expect(run(`<div style={{ order: 2 }}>Second?</div>`)).toContain('meaningful-order');
    expect(run(`<div style={{ order: 0 }}>Normal</div>`)).not.toContain('meaningful-order');
  });
  it('no-outline-none', () => {
    expect(run(`<button style={{ outline: 'none' }}>Save</button>`)).toContain('no-outline-none');
    expect(run(`<div style={{ outline: 'none' }}>text</div>`)).not.toContain('no-outline-none');
    expect(run(`<button style={{ color: 'red' }}>Save</button>`)).not.toContain('no-outline-none');
  });
});

describe('forms (WCAG 2.2)', () => {
  it('error-identification and no-autocomplete-off', () => {
    expect(run(`<input id="e" aria-invalid={hasError} />`)).toContain('error-identification');
    expect(run(`<input id="e" aria-invalid={hasError} aria-describedby="e-err" />`)).not.toContain('error-identification');
    expect(run(`<input id="e" type="email" autoComplete="off" />`)).toContain('no-autocomplete-off');
    expect(run(`<input id="q" type="search" name="query" autoComplete="off" />`)).not.toContain('no-autocomplete-off');
  });
  it('accessible-authentication', () => {
    expect(run(`<input type="password" id="pw" autoComplete="off" />`)).toContain('accessible-authentication');
    expect(run(`<input type="password" id="pw" onPaste={block} autoComplete="current-password" />`)).toContain('accessible-authentication');
    expect(run(`<input type="password" id="pw" autoComplete="current-password" />`)).not.toContain('accessible-authentication');
  });
});

describe('cross-file label resolution (project-wide, beyond jsx-a11y)', () => {
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
