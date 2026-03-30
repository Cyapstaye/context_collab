import { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { api } from '../../api';

interface Props {
  onClose: () => void;
}

export default function ExportModal({ onClose }: Props) {
  const pageId = useCanvasStore((s) => s.pageId);
  const projectId = useCanvasStore((s) => s.projectId);

  const [json, setJson] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pageId || !projectId) return;
    api
      .exportPage(projectId, pageId)
      .then((res) => setJson(JSON.stringify(res.data, null, 2)))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load export'));
  }, [pageId, projectId]);

  async function handleCopy() {
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the textarea so the user can copy manually
      const el = document.getElementById('export-textarea') as HTMLTextAreaElement | null;
      el?.select();
    }
  }

  const loading = json === null && loadError === null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-[520px] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-border bg-panel shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Export Data</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 px-5 py-4">
          <p className="text-xs text-gray-500">
            The full page snapshot in JSON format. Copy it and use it with the Import feature
            to restore or merge the data into another page.
          </p>

          {loading && (
            <div className="flex h-44 items-center justify-center text-xs text-gray-400">
              Loading…
            </div>
          )}

          {loadError && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {loadError}
            </p>
          )}

          {json !== null && (
            <textarea
              id="export-textarea"
              readOnly
              value={json}
              className="h-64 w-full resize-none rounded border border-border bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400"
              spellCheck={false}
              onFocus={(e) => e.target.select()}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={json === null}
            className="rounded bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
