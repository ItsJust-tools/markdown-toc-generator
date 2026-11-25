'use client';

import React from 'react';
import { LINK_STYLES, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}
const fieldClass =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const update = (patch: Partial<ToolState>) => onChange({ ...state, ...patch });
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="toc-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Heading depth</h3>
        <label className="block text-xs text-gray-600 dark:text-gray-300">
          Minimum level (1–6)
          <input
            type="number"
            min={1}
            max={6}
            data-testid="input-min-level"
            value={state.minLevel}
            onChange={(e) => update({ minLevel: Number(e.target.value) || 1 })}
            className={fieldClass}
          />
        </label>
        <label className="mt-2 block text-xs text-gray-600 dark:text-gray-300">
          Maximum depth (1–6)
          <input
            type="number"
            min={1}
            max={6}
            data-testid="input-max-depth"
            value={state.maxDepth}
            onChange={(e) => update({ maxDepth: Number(e.target.value) || 1 })}
            className={fieldClass}
          />
        </label>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Options</h3>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            data-testid="input-numbering"
            checked={state.numbering}
            onChange={(e) => update({ numbering: e.target.checked })}
          />
          Hierarchical numbering (1., 1.1, 1.1.1)
        </label>
        <label className="mt-2 block text-xs text-gray-600 dark:text-gray-300">
          Link style
          <select
            data-testid="input-link-style"
            value={state.linkStyle}
            onChange={(e) => update({ linkStyle: e.target.value as ToolState['linkStyle'] })}
            className={fieldClass}
          >
            {LINK_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Excluded headings</h3>
        <textarea
          data-testid="input-exclude"
          rows={4}
          value={state.exclude}
          onChange={(e) => update({ exclude: e.target.value })}
          placeholder="One exact heading text per line"
          className={fieldClass}
        />
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>G</kbd> — regenerate TOC
          </li>
          <li>
            <kbd>Y</kbd> — copy TOC
          </li>
          <li>
            <kbd>N</kbd> — toggle numbering
          </li>
          <li>
            <kbd>I</kbd> — insert TOC into source
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current markdown and options;
          open it to restore this state.
        </p>
      </div>
    </div>
  );
};
