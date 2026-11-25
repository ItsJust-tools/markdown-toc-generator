import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'markdown-toc-generator',
  name: 'Markdown TOC Generator',
  description:
    'Generate a table of contents from markdown headings with GitHub-style anchor links, depth control, numbering, ignore lists and one-click copy or insertion.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.12)',
    brand: 'Markdown TOC Generator',
    icon: '☰',
  },
  shortcuts: [
    {
      title: 'Markdown TOC Generator',
      shortcuts: [
        { keys: 'G', label: 'Generate', description: 'regenerate the table of contents' },
        { keys: 'Y', label: 'Copy TOC', description: 'copy the generated TOC to the clipboard' },
        { keys: 'N', label: 'Numbering', description: 'toggle hierarchical numbering' },
        {
          keys: 'I',
          label: 'Insert',
          description: 'insert the TOC into the markdown source',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
