export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './template-metadata';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export {
  markdownTocGeneratorTool,
  serializeState,
  deserializeState,
  roundTrips,
  generateToc,
  parseHeadings,
  summaryText,
  DEFAULT_STATE,
} from './tool-definition';
export { Canvas } from './components/Canvas';
export { Sidebar } from './components/Sidebar';
export { Toolbar } from './components/Toolbar';
export { LINK_STYLES } from './types';
export {
  slugify,
  stripInlineMarkdown,
  anchorFor,
  applyExclusions,
  numberingFor,
  filterByDepth,
  indentFor,
  insertToc,
} from './types';
export type { Heading, HeadingLevel, LinkStyle, ToolState } from './types';
