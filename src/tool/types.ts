export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type LinkStyle = 'anchors' | 'plain';

export const LINK_STYLES: { value: LinkStyle; label: string; hint: string }[] = [
  { value: 'anchors', label: 'Anchor links', hint: '[Heading](#heading)' },
  { value: 'plain', label: 'Plain text', hint: 'Heading' },
];

export interface ToolState {
  /** Markdown source to analyze. */
  markdown: string;
  /** Maximum heading depth included (1-6). */
  maxDepth: number;
  /** Minimum heading level to start the list at (1 = keep original levels). */
  minLevel: number;
  /** Emit 1., 1.1, 1.1.1 numbering prefixes. */
  numbering: boolean;
  /** Exact heading texts to exclude (case-sensitive trim match). */
  exclude: string;
  /** Link style: GitHub anchor links or plain text entries. */
  linkStyle: 'anchors' | 'plain';
}

export const DEFAULT_STATE: ToolState = {
  markdown: '# Introduction\n\nSome text.\n\n## Getting Started\n\n### Installation\n\n## Usage',
  maxDepth: 3,
  minLevel: 1,
  numbering: false,
  exclude: '',
  linkStyle: 'anchors',
};

export interface Heading {
  level: HeadingLevel;
  /** Heading text without markdown markup. */
  text: string;
  /** GitHub-style anchor slug derived from the text. */
  slug: string;
  /** Line number (1-based) in the source. */
  line: number;
  /** 1-based index among duplicates with the same slug. */
  duplicateIndex: number;
}

export interface HeadingParseResult {
  headings: Heading[];
  /** Fenced code blocks found while scanning, so callers can skip them. */
  errors: string[];
}

/**
 * GitHub-style slugification: lowercase, strip punctuation (keeping
 * word characters, spaces and hyphens), replace spaces with hyphens.
 * Accented characters are kept, matching GitHub renderers closely.
 */
export function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      // remove emoji and most symbols, keep letters/numbers/spaces/hyphens
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
  );
}

/** Strip inline markdown (images, links, code, bold/italics) from heading text. */
export function stripInlineMarkdown(text: string): string {
  let out = text;
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  out = out.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  out = out.replace(/`([^`]*)`/g, '$1');
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
  out = out.replace(/\*([^*]+)\*/g, '$1');
  out = out.replace(/_([^_]+)_/g, '$1');
  out = out.replace(/~~([^~]+)~~/g, '$1');
  return out.trim();
}

/** Parse ATX headings (#{1,6} text) outside fenced code blocks. */
export function parseHeadings(markdown: string): Heading[] {
  if (!markdown.trim()) return [];
  const lines = markdown.split(/\r?\n/);
  const headings: Omit<Heading, 'duplicateIndex'>[] = [];
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1] ?? '';
      const ch = marker.charAt(0);
      const len = marker.length;
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
        fenceLen = len;
      } else if (ch === fenceChar && len >= fenceLen && line.trim() === marker) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    const headingMatch = line.match(/^(#{1,6})(\s+)(.*)$/);
    if (!headingMatch) continue;
    const level = (headingMatch[1] ?? '#').length as HeadingLevel;
    let raw = (headingMatch[3] ?? '').replace(/\s+#+\s*$/, '').trim();
    raw = raw.replace(/^#+$/, '').trim();
    if (!raw) continue;
    const text = stripInlineMarkdown(raw);
    headings.push({ level, text, slug: slugify(text), line: i + 1 });
  }
  const counts = new Map<string, number>();
  return headings.map((h) => {
    const index = counts.get(h.slug) ?? 0;
    counts.set(h.slug, index + 1);
    return { ...h, duplicateIndex: index };
  });
}

/** Anchor text as GitHub renders it: first occurrence plain, repeats get -1, -2. */
export function anchorFor(heading: Heading): string {
  return heading.duplicateIndex === 0 ? heading.slug : `${heading.slug}-${heading.duplicateIndex}`;
}

/** Apply the exclusion list: exact trimmed-text matches are removed. */
export function applyExclusions(headings: Heading[], exclude: string): Heading[] {
  const ignored = new Set(
    exclude
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  );
  if (ignored.size === 0) return headings;
  return headings.filter((h) => !ignored.has(h.text));
}

export interface NumberingState {
  counters: number[];
}

/** Compute the hierarchical number (e.g. "1.2.1") for a heading given counters. */
export function numberingFor(level: HeadingLevel, counters: number[]): string {
  const depth = Math.min(level, 6);
  while (counters.length < depth) counters.push(0);
  counters.length = depth;
  counters[depth - 1] = (counters[depth - 1] ?? 0) + 1;
  return counters.slice(0, depth).join('.');
}

/**
 * Filter headings by depth range: levels below minLevel are dropped,
 * levels above maxDepth are dropped.
 */
export function filterByDepth(headings: Heading[], minLevel: number, maxDepth: number): Heading[] {
  const min = Math.min(Math.max(1, minLevel), 6);
  const max = Math.min(Math.max(1, maxDepth), 6);
  return headings.filter((h) => h.level >= min && h.level <= max);
}

/** Indentation for nested lists relative to the shallowest visible level. */
export function indentFor(heading: Heading, visibleMinLevel: number): string {
  const depth = Math.max(0, heading.level - visibleMinLevel);
  return '  '.repeat(depth) + '- ';
}

/**
 * Generate the table of contents markdown.
 * Returns an empty string when no headings survive filtering.
 */
export function generateToc(state: ToolState): string {
  const headings = filterByDepth(
    applyExclusions(parseHeadings(state.markdown), state.exclude),
    state.minLevel,
    state.maxDepth
  );
  if (headings.length === 0) return '';
  const visibleMinLevel = Math.min(...headings.map((h) => h.level));
  const counters: number[] = [];
  const lines = headings.map((h) => {
    const indent = indentFor(h, visibleMinLevel);
    const numberPrefix = state.numbering ? `${numberingFor(h.level, counters)}. ` : '';
    const label = h.text;
    const target = state.linkStyle === 'anchors' ? `[${label}](#${anchorFor(h)})` : label;
    return `${indent}${numberPrefix}${target}`;
  });
  return lines.join('\n');
}

/** Insert (or replace) the TOC after the first heading block of the document. */
export function insertToc(markdown: string, toc: string): string {
  if (!toc) return markdown;
  const lines = markdown.split(/\r?\n/);
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i] ?? '';
    if (/^<toc>\s*$/.test(current.trim())) {
      // replace existing marker block
      let end = i + 1;
      while (end < lines.length && (lines[end] ?? '').trim() !== '</toc>') end++;
      const before = lines.slice(0, i);
      const after = lines.slice(Math.min(end + 1, lines.length));
      return [...before, '<toc>', ...toc.split('\n'), '</toc>', ...after].join('\n');
    }
    if (/^#{1,6}\s/.test(lines[i] ?? '')) {
      insertAt = i + 1;
    }
  }
  const before = lines.slice(0, insertAt);
  const after = lines.slice(insertAt);
  return [...before, '', '<toc>', ...toc.split('\n'), '</toc>', '', ...after].join('\n');
}

/** Compact summary for the status bar. */
export function summaryText(state: ToolState): string {
  const headings = parseHeadings(state.markdown);
  const shown = filterByDepth(
    applyExclusions(headings, state.exclude),
    state.minLevel,
    state.maxDepth
  ).length;
  return `${shown} of ${headings.length} headings`;
}
