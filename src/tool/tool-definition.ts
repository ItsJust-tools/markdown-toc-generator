import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  anchorFor,
  applyExclusions,
  filterByDepth,
  generateToc,
  indentFor,
  insertToc,
  numberingFor,
  parseHeadings,
  slugify,
  stripInlineMarkdown,
  summaryText,
  type HeadingLevel,
  type LinkStyle,
  type ToolState,
} from './types';

const LINK_STYLES: LinkStyle[] = ['anchors', 'plain'];

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validLinkStyle(value: unknown): LinkStyle {
  return LINK_STYLES.includes(value as LinkStyle) ? (value as LinkStyle) : DEFAULT_STATE.linkStyle;
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    markdown: state.markdown,
    maxDepth: state.maxDepth,
    minLevel: state.minLevel,
    numbering: state.numbering,
    exclude: state.exclude,
    linkStyle: state.linkStyle,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected markdown TOC generator state object',
    };
  }
  const v = data as Record<string, unknown>;
  if (typeof v.markdown !== 'undefined' && typeof v.markdown !== 'string') {
    return { success: false, error: 'Invalid data format: markdown must be a string' };
  }
  const state: ToolState = {
    markdown: stringOr(v.markdown, DEFAULT_STATE.markdown),
    maxDepth: clampInt(v.maxDepth, 1, 6, DEFAULT_STATE.maxDepth),
    minLevel: clampInt(v.minLevel, 1, 6, DEFAULT_STATE.minLevel),
    numbering: typeof v.numbering === 'boolean' ? v.numbering : DEFAULT_STATE.numbering,
    exclude: stringOr(v.exclude, DEFAULT_STATE.exclude),
    linkStyle: validLinkStyle(v.linkStyle),
  };
  return { success: true, data: state };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const markdownTocGeneratorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export {
  DEFAULT_STATE,
  anchorFor,
  applyExclusions,
  filterByDepth,
  generateToc,
  indentFor,
  insertToc,
  numberingFor,
  parseHeadings,
  slugify,
  stripInlineMarkdown,
  summaryText,
};
export type { HeadingLevel, LinkStyle, ToolState };
