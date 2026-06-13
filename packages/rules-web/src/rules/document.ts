import { staticString } from '@aish/react-a11y-core';
import { defineRule, isDomTag } from '../util.js';

/** Blocking pinch-zoom prevents low-vision users from reading the page. */
export const metaViewportZoomable = defineRule(
  {
    id: 'meta-viewport-zoomable',
    description: 'The viewport meta tag must not disable or limit zoom.',
    severity: 'serious',
    wcag: ['1.4.4'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'meta')) return;
    if (staticString(el, 'name')?.trim().toLowerCase() !== 'viewport') return;
    const content = staticString(el, 'content');
    if (content === undefined) return;
    const normalized = content.toLowerCase().replace(/\s/g, '');
    if (/user-scalable=(no|0)/.test(normalized)) {
      ctx.report({ el, message: 'user-scalable=no prevents pinch-zoom — low-vision users cannot enlarge text.' });
      return;
    }
    const maxScale = normalized.match(/maximum-scale=([\d.]+)/);
    if (maxScale && Number(maxScale[1]) < 2) {
      ctx.report({ el, message: `maximum-scale=${maxScale[1]} limits zoom below 200% (WCAG requires text resizable to 200%).` });
    }
  },
);

/** Meta refresh redirects/reloads on a timer users cannot control. */
export const noMetaRefresh = defineRule(
  {
    id: 'no-meta-refresh',
    description: 'Do not use <meta http-equiv="refresh">.',
    severity: 'serious',
    wcag: ['2.2.1'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'meta')) return;
    const httpEquiv = staticString(el, 'httpEquiv') ?? staticString(el, 'http-equiv');
    if (httpEquiv?.trim().toLowerCase() === 'refresh') {
      ctx.report({ el, message: '<meta http-equiv="refresh"> reloads or redirects on a timer users cannot adjust or disable.' });
    }
  },
);

/** Empty <title> leaves the page unnamed in tabs, history and screen readers. */
export const titleHasContent = defineRule(
  {
    id: 'title-has-content',
    description: '<title> must not be empty.',
    severity: 'serious',
    wcag: ['2.4.2'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'title')) return;
    if (el.hasTextChild || el.hasExpressionChild || el.hasSpread) return;
    ctx.report({ el, message: '<title> is empty — the page has no name in tabs, bookmarks or screen reader announcements.' });
  },
);
