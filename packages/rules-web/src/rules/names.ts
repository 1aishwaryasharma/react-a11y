import {
  attrProvidesValue,
  hasAccessibleName,
  hasAttr,
  isAriaHidden,
  isPresentational,
  staticString,
  staticValue,
} from '@react-a11y/core';
import { defineRule, isDomTag } from '../util.js';

const REDUNDANT_ALT = /\b(image|picture|photo|photograph|graphic|icon|screenshot)\s+of\b/i;
const FILENAME_ALT = /\.(png|jpe?g|gif|svg|webp|avif|bmp)\s*$/i;

/**
 * <img>, <area> and Next.js <Image> need alternative text.
 * alt="" is valid for decorative images; redundant or filename alts are flagged.
 */
export const imgAlt = defineRule(
  {
    id: 'img-alt',
    description: 'Images must have an alt attribute (empty for decorative images).',
    severity: 'critical',
    wcag: ['1.1.1'],
  },
  (el, ctx) => {
    const isNextImage = el.isComponent && el.importSource === 'next/image';
    const isDomImg = isDomTag(el, 'img', 'area');
    if (!isNextImage && !isDomImg) return;
    if (isAriaHidden(el) || isPresentational(el)) return;

    const alt = el.attrs.get('alt');
    if (!alt) {
      if (el.hasSpread || attrProvidesValue(el, 'aria-label') || attrProvidesValue(el, 'aria-labelledby')) return;
      ctx.report({
        el,
        message: `<${el.name}> is missing an alt attribute. Use alt="" only if the image is purely decorative.`,
      });
      return;
    }
    if (alt.kind !== 'static' || typeof alt.value !== 'string') return;
    const text = alt.value.trim();
    if (text.length === 0) return; // decorative — valid
    if (REDUNDANT_ALT.test(text)) {
      ctx.report({
        el,
        message: `alt text "${text}" contains redundant words — screen readers already announce images. Describe the content instead.`,
        severity: 'moderate',
      });
    } else if (FILENAME_ALT.test(text)) {
      ctx.report({
        el,
        message: `alt text "${text}" looks like a filename. Describe what the image conveys.`,
        severity: 'serious',
      });
    }
  },
);

/** Links must have discernible text. */
export const anchorHasContent = defineRule(
  {
    id: 'anchor-has-content',
    description: 'Anchors (and Next.js <Link>) must have an accessible name.',
    severity: 'serious',
    wcag: ['2.4.4', '4.1.2'],
  },
  (el, ctx) => {
    const isNextLink = el.isComponent && el.importSource === 'next/link';
    if (!isDomTag(el, 'a') && !isNextLink) return;
    if (isAriaHidden(el) || isPresentational(el)) return;
    if (hasAccessibleName(el)) return;
    ctx.report({
      el,
      message: `<${el.name}> has no accessible name. Add text content, aria-label, or an image with alt text.`,
    });
  },
);

/** Buttons (and role="button" elements) must have an accessible name. */
export const buttonHasName = defineRule(
  {
    id: 'button-has-accessible-name',
    description: 'Buttons must have an accessible name.',
    severity: 'critical',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    const isButtonTag = isDomTag(el, 'button');
    const hasButtonRole = !el.isComponent && staticString(el, 'role')?.trim() === 'button';
    if (!isButtonTag && !hasButtonRole) return;
    if (isAriaHidden(el)) return;
    if (hasAccessibleName(el)) return;
    ctx.report({
      el,
      message: `<${el.name}${hasButtonRole && !isButtonTag ? ' role="button"' : ''}> has no accessible name. Icon-only buttons need aria-label.`,
    });
  },
);

/** Headings must not be empty. */
export const headingHasContent = defineRule(
  {
    id: 'heading-has-content',
    description: 'Headings must have content readable by assistive technology.',
    severity: 'moderate',
    wcag: ['1.3.1', '2.4.6'],
  },
  (el, ctx) => {
    const isHeading = isDomTag(el, 'h1', 'h2', 'h3', 'h4', 'h5', 'h6') ||
      (!el.isComponent && staticString(el, 'role')?.trim() === 'heading');
    if (!isHeading) return;
    if (isAriaHidden(el)) return;
    if (hasAccessibleName(el)) return;
    ctx.report({ el, message: `<${el.name}> heading is empty. Empty headings confuse screen reader navigation.` });
  },
);

/** Frames need titles so screen reader users know what they contain. */
export const iframeHasTitle = defineRule(
  {
    id: 'iframe-has-title',
    description: '<iframe> elements must have a title describing their content.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'iframe')) return;
    if (el.hasSpread || isAriaHidden(el)) return;
    if (attrProvidesValue(el, 'title') || attrProvidesValue(el, 'aria-label')) return;
    ctx.report({ el, message: '<iframe> is missing a title attribute describing its content.' });
  },
);

/** <html> (or Next.js <Html>) must declare the page language. */
export const htmlHasLang = defineRule(
  {
    id: 'html-has-lang',
    description: 'The <html> element must have a lang attribute.',
    severity: 'serious',
    wcag: ['3.1.1'],
  },
  (el, ctx) => {
    const isHtmlTag = isDomTag(el, 'html');
    const isNextHtml = el.isComponent && el.name === 'Html' && el.importSource === 'next/document';
    if (!isHtmlTag && !isNextHtml) return;
    if (el.hasSpread) return;
    if (attrProvidesValue(el, 'lang')) return;
    ctx.report({
      el,
      message: `<${el.name}> is missing a lang attribute, so screen readers may use the wrong speech synthesizer.`,
    });
  },
);

/** Media elements need captions for deaf and hard-of-hearing users. */
export const mediaHasCaptions = defineRule(
  {
    id: 'media-has-captions',
    description: '<video> and <audio> must include a captions track.',
    severity: 'serious',
    wcag: ['1.2.2'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'video', 'audio')) return;
    if (el.hasSpread || el.hasExpressionChild) return;
    if (staticValue(el, 'muted') === true) return; // muted media has no audio to caption
    const hasCaptions = el.childElements.some((child) => {
      if (child.name !== 'track') return false;
      const kind = staticString(child, 'kind')?.trim().toLowerCase();
      return kind === 'captions' || kind === 'subtitles' || child.hasSpread;
    });
    if (hasCaptions) return;
    ctx.report({
      el,
      message: `<${el.name}> has no <track kind="captions">. Provide captions for prerecorded audio content.`,
    });
  },
);
