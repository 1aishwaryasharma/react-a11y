import type { ElementNode, Rule, RuleMeta, RuleContext, RuleVisitor } from '@react-a11y/core';
import { readOwnPackageMeta } from '@react-a11y/core';

const homepage = readOwnPackageMeta(import.meta.url).homepage;
const HELP_BASE = homepage ? `${homepage}/blob/main/docs/rules/web.md#` : undefined;

export function defineRule(
  meta: Omit<RuleMeta, 'platforms' | 'helpUrl'>,
  element: (el: ElementNode, ctx: RuleContext) => void,
): Rule {
  return {
    meta: { ...meta, platforms: ['web'], ...(HELP_BASE ? { helpUrl: `${HELP_BASE}${meta.id}` } : {}) },
    create(ctx): RuleVisitor {
      return { element: (el) => element(el, ctx) };
    },
  };
}

export function isDomTag(el: ElementNode, ...names: string[]): boolean {
  return !el.isComponent && names.includes(el.name);
}
