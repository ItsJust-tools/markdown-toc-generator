'use client';

import React from 'react';
import { generateToc } from '../tool-definition';
import type { ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const toc = generateToc(state);

  const handleInsert = React.useCallback(() => {
    if (onSaveHistory) onSaveHistory('TOC inserted into document');
  }, [onSaveHistory]);

  return (
    <div className="space-y-4 p-4" data-testid="toc-canvas">
      <div data-testid="editor-section">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Markdown source</h2>
        <textarea
          data-testid="input-markdown"
          value={state.markdown}
          onChange={(e) => update({ markdown: e.target.value })}
          rows={10}
          className={inputClass + ' font-mono'}
          placeholder="Paste markdown with # headings here"
          aria-label="Markdown source"
        />
      </div>

      <div data-testid="result-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Generated table of contents
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="btn-copy-toc"
              className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(toc);
                } catch {
                  // clipboard unavailable; ignore
                }
              }}
            >
              Copy TOC
            </button>
            <button
              type="button"
              data-testid="btn-insert-toc"
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={handleInsert}
            >
              Insert into document
            </button>
          </div>
        </div>
        <pre
          data-testid="result-main"
          className="mt-2 overflow-auto rounded-md bg-gray-50 p-3 font-mono text-xs dark:bg-gray-800"
        >
          {toc || 'No headings match the current filters.'}
        </pre>
        <ul
          data-testid="result-list"
          className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300"
        >
          {toc.split('\n').filter(Boolean).length === 0 ? (
            <li>No entries</li>
          ) : (
            toc
              .split('\n')
              .filter(Boolean)
              .map((line, i) => <li key={i}>{line.replace(/^-+\s*/, '')}</li>)
          )}
        </ul>
      </div>
    </div>
  );
};
