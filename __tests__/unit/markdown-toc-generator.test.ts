import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATE,
  anchorFor,
  applyExclusions,
  deserializeState,
  filterByDepth,
  generateToc,
  indentFor,
  insertToc,
  markdownTocGeneratorTool,
  numberingFor,
  parseHeadings,
  roundTrips,
  serializeState,
  slugify,
  stripInlineMarkdown,
  summaryText,
} from '@/tool/tool-definition';
import type { Heading, ToolState } from '@/tool/types';

function heading(level: 1 | 2 | 3 | 4 | 5 | 6, text: string, duplicateIndex = 0): Heading {
  return { level, text, slug: slugify(text), line: 1, duplicateIndex };
}

function state(overrides: Partial<ToolState> = {}): ToolState {
  return { ...DEFAULT_STATE, ...overrides };
}

describe('slugify', () => {
  it('lowercases and hyphenates simple headings', () => {
    expect(slugify('Getting Started')).toBe('getting-started');
  });

  it('strips punctuation like GitHub', () => {
    expect(slugify("What's New? (v2.0)")).toBe('whats-new-v20');
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('keeps accented letters', () => {
    expect(slugify('Über uns')).toBe('über-uns');
  });

  it('drops emoji', () => {
    expect(slugify('🚀 Launch 🎉 Day')).toBe('-launch-day');
  });

  it('collapses whitespace runs into one hyphen', () => {
    expect(slugify('A   B\tC')).toBe('a-b-c');
  });
});

describe('stripInlineMarkdown', () => {
  it('unwraps links, images, code and emphasis', () => {
    expect(stripInlineMarkdown('**Bold** and *italic*')).toBe('Bold and italic');
    expect(stripInlineMarkdown('[text](https://example.com)')).toBe('text');
    expect(stripInlineMarkdown('![alt](img.png)')).toBe('alt');
    expect(stripInlineMarkdown('code `x()` end')).toBe('code x() end');
  });
});

describe('parseHeadings', () => {
  it('parses ATX headings with levels and lines', () => {
    const md = '# One\n\ntext\n\n### Three';
    const hs = parseHeadings(md);
    expect(hs).toHaveLength(2);
    expect(hs[0]).toMatchObject({ level: 1, text: 'One', line: 1 });
    expect(hs[1]).toMatchObject({ level: 3, text: 'Three', line: 5 });
  });

  it('ignores fenced code blocks', () => {
    const md = '```\n# not a heading\n```\n\n## Real';
    const hs = parseHeadings(md);
    expect(hs).toHaveLength(1);
    expect(hs[0]?.text).toBe('Real');
  });

  it('ignores # lines inside tilde fences and resumes after closing', () => {
    const md = '~~~\n# no\n~~~\n\n## Yes';
    expect(parseHeadings(md)).toHaveLength(1);
  });

  it('supports up to six hashes only', () => {
    const md = '####### seven\n###### six';
    const hs = parseHeadings(md);
    expect(hs).toHaveLength(1);
    expect(hs[0]?.level).toBe(6);
  });

  it('skips empty headings and closing hash runs', () => {
    const md = '## ##\n\n## Real ##';
    const hs = parseHeadings(md);
    expect(hs).toHaveLength(1);
    expect(hs[0]?.text).toBe('Real');
  });

  it('counts duplicate slugs with -1, -2 suffixes', () => {
    const md = '## Dup\n\n## Dup\n\n## Dup';
    const hs = parseHeadings(md);
    expect(anchorFor(hs[0] as Heading)).toBe('dup');
    expect(anchorFor(hs[1] as Heading)).toBe('dup-1');
    expect(anchorFor(hs[2] as Heading)).toBe('dup-2');
  });

  it('returns empty for empty markdown', () => {
    expect(parseHeadings('')).toEqual([]);
    expect(parseHeadings('   \n  ')).toEqual([]);
  });
});

describe('filterByDepth and depth options', () => {
  const hs: Heading[] = [
    heading(1, 'One'),
    heading(2, 'Two'),
    heading(3, 'Three'),
    heading(4, 'Four'),
  ];
  it('excludes headings deeper than maxDepth', () => {
    expect(filterByDepth(hs, 1, 2).map((h) => h.text)).toEqual(['One', 'Two']);
  });
  it('respects minLevel', () => {
    expect(filterByDepth(hs, 2, 6).map((h) => h.text)).toEqual(['Two', 'Three', 'Four']);
  });
  it('clamps invalid bounds', () => {
    expect(filterByDepth(hs, -3, 99)).toHaveLength(4);
  });
});

describe('applyExclusions', () => {
  it('removes headings whose text matches an ignore line exactly', () => {
    const hs = [heading(1, 'Keep'), heading(2, 'Skip Me')];
    expect(applyExclusions(hs, 'Skip Me').map((h) => h.text)).toEqual(['Keep']);
  });
  it('trims lines and ignores blanks', () => {
    const hs = [heading(1, 'A'), heading(1, 'B')];
    expect(applyExclusions(hs, '\n A \n\n').map((h) => h.text)).toEqual(['B']);
  });
  it('keeps everything with an empty list', () => {
    const hs = [heading(1, 'A')];
    expect(applyExclusions(hs, '')).toHaveLength(1);
  });
});

describe('numberingFor', () => {
  it('builds hierarchical numbers', () => {
    const counters: number[] = [];
    expect(numberingFor(1, counters)).toBe('1');
    expect(numberingFor(2, counters)).toBe('1.1');
    expect(numberingFor(2, counters)).toBe('1.2');
    expect(numberingFor(3, counters)).toBe('1.2.1');
    expect(numberingFor(1, counters)).toBe('2');
  });
});

describe('indentFor', () => {
  it('indents relative to the shallowest visible level', () => {
    expect(indentFor(heading(1, 'A'), 1)).toBe('- ');
    expect(indentFor(heading(3, 'C'), 1)).toBe('    - ');
  });
});

describe('generateToc', () => {
  it('generates anchor links by default', () => {
    const toc = generateToc(state({ markdown: '# Intro\n\n## Setup' }));
    expect(toc).toBe('- [Intro](#intro)\n  - [Setup](#setup)');
  });

  it('respects maxDepth', () => {
    const toc = generateToc(state({ markdown: '# A\n\n## B\n\n### C', maxDepth: 2 }));
    expect(toc).toBe('- [A](#a)\n  - [B](#b)');
  });

  it('adds hierarchical numbering when enabled', () => {
    const toc = generateToc(state({ markdown: '# A\n\n## B\n\n## C', numbering: true }));
    expect(toc).toBe('- 1. [A](#a)\n  - 1.1. [B](#b)\n  - 1.2. [C](#c)');
  });

  it('supports plain link style', () => {
    const toc = generateToc(state({ markdown: '# A', linkStyle: 'plain' }));
    expect(toc).toBe('- A');
  });

  it('applies the exclusion list', () => {
    const toc = generateToc(state({ markdown: '# A\n\n## Skip', exclude: 'Skip' }));
    expect(toc).toBe('- [A](#a)');
  });

  it('returns an empty string with no headings', () => {
    expect(generateToc(state({ markdown: 'no headings here' }))).toBe('');
  });

  it('returns an empty string for empty markdown without error', () => {
    expect(generateToc(state({ markdown: '' }))).toBe('');
  });

  it('normalizes indentation to the shallowest visible level', () => {
    const toc = generateToc(state({ markdown: '## B\n\n### C', minLevel: 2 }));
    expect(toc).toBe('- [B](#b)\n  - [C](#c)');
  });
});

describe('insertToc', () => {
  it('inserts after the last leading heading block', () => {
    const md = '# Title\n\nBody text';
    const out = insertToc(md, '- [Title](#title)');
    expect(out).toContain('<toc>');
    expect(out).toContain('- [Title](#title)');
    expect(out.indexOf('- [Title]')).toBeGreaterThan(out.indexOf('# Title'));
  });

  it('replaces an existing toc block', () => {
    const md = '# T\n\n<toc>\n- old\n</toc>\n\nBody';
    const out = insertToc(md, '- [T](#t)');
    expect(out).not.toContain('old');
    expect((out.match(/<toc>/g) ?? []).length).toBe(1);
  });

  it('returns the document unchanged when the toc is empty', () => {
    expect(insertToc('# T', '')).toBe('# T');
  });
});

describe('summaryText', () => {
  it('reports shown vs total headings', () => {
    const s = state({ markdown: '# A\n\n## B\n\n### C', maxDepth: 2 });
    expect(summaryText(s)).toBe('2 of 3 headings');
  });
});

describe('serialize / deserialize', () => {
  it('round-trips a full state', () => {
    const full = state({ markdown: '# X', numbering: true, maxDepth: 4, minLevel: 2 });
    expect(roundTrips(full)).toBe(true);
  });

  it('validates bad payloads', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1]).success).toBe(false);
    expect(deserializeState({ markdown: 42 }).success).toBe(false);
  });

  it('recovers defaults from junk and clamps ranges', () => {
    const repaired = deserializeState({ nope: true });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.maxDepth).toBe(DEFAULT_STATE.maxDepth);
      expect(repaired.data.linkStyle).toBe('anchors');
    }
    const clamped = deserializeState({ maxDepth: 99, minLevel: -2, linkStyle: 'wild' });
    expect(clamped.success).toBe(true);
    if (clamped.success) {
      expect(clamped.data.maxDepth).toBe(6);
      expect(clamped.data.minLevel).toBe(1);
      expect(clamped.data.linkStyle).toBe('anchors');
    }
  });

  it('serializes to a JSON string', () => {
    const s = serializeState(state({ markdown: '# Hi' }));
    expect(typeof s).toBe('string');
    expect(JSON.parse(s).markdown).toBe('# Hi');
  });

  it('exposes the tool identity', () => {
    expect(markdownTocGeneratorTool.id).toBe('markdown-toc-generator');
    expect(markdownTocGeneratorTool.name).toBe('Markdown TOC Generator');
    expect(markdownTocGeneratorTool.exporters).toHaveLength(4);
  });
});
