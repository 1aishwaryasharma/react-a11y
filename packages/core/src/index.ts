export * from './types.js';
export * from './element.js';
export * from './helpers.js';
export * from './aria.js';
export { WCAG, WCAG22_TOTALS, WCAG22_A_AA, MANUAL_CHECKS, resolveWcag } from './wcag.js';
export { parseColor, contrastRatio, relativeLuminance, isLargeText, type Rgb } from './color.js';
export { parseSource } from './parse.js';
export { analyze, analyzeModel, type AnalyzeOptions, type AnalyzeModelOptions } from './engine.js';
export { applyFixes, fixRemoveAttr, fixRenameAttr } from './fixes.js';
export { scanProject, collectFiles, detectPlatform, detectPlatformDetailed, filePlatform, type ScanOptions } from './scanner.js';
export { loadConfig, validateConfig, globToRegExp } from './config.js';
export { readPackageMeta, readOwnPackageMeta, type PackageMeta } from './pkg-meta.js';
export {
  readProjectInfo,
  readDependencies,
  readTailwindTheme,
  readTailwindConfigColors,
  readCssThemeColors,
  readCssRootVars,
  resolveThemeVars,
  readBundlerRem,
  manifestChain,
  clearProjectCaches,
  majorVersion,
  versionParts,
  ProjectResolver,
  type ProjectInfo,
  type TailwindTheme,
  type PlatformDetection,
} from './project.js';
export {
  resolveClassString,
  resolveColor,
  resolveLength,
  applyUtility,
  isContrastExemptLayer,
  isFocusLayer,
  DEFAULT_TAILWIND_OPTIONS,
  type TailwindOptions,
  type TailwindPreset,
  type TailwindStyle,
} from './tailwind.js';
export {
  styleModel,
  effectiveStyle,
  resolvedStyleNumber,
  resolvedStyleString,
  contrastFindings,
  sizeCandidates,
  targetSizeFindings,
  classesRemoveOutline,
  isVisuallyHidden,
  type StyleModel,
  type ContrastFinding,
  type LayerOrigin,
  type SizeCandidate,
  type TargetSizeFinding,
} from './styles.js';
export { toJson } from './reporters/json.js';
export { toSarif } from './reporters/sarif.js';
