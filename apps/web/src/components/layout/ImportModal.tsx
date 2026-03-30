import { useState, useMemo } from 'react';
import { PageExportSchema } from '@context-collab/shared';
import { useCanvasStore } from '../../store/canvasStore';
import { api } from '../../api';
import type { PageExport } from '../../api';

interface Props {
  onClose: () => void;
}

type ParseState =
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'valid'; data: PageExport };

export default function ImportModal({ onClose }: Props) {
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pageId = useCanvasStore((s) => s.pageId);
  const projectId = useCanvasStore((s) => s.projectId);
  const existingNodes = useCanvasStore((s) => s.nodes);
  const existingEdges = useCanvasStore((s) => s.edges);
  const applyRemoteNodeCreated = useCanvasStore((s) => s.applyRemoteNodeCreated);
  const applyRemoteEdgeCreated = useCanvasStore((s) => s.applyRemoteEdgeCreated);
  const addPageLabel = useCanvasStore((s) => s.addPageLabel);
  const addPageRelation = useCanvasStore((s) => s.addPageRelation);

  const parsed = useMemo<ParseState>(() => {
    const trimmed = text.trim();
    if (!trimmed) return { status: 'empty' };
    try {
      const raw = JSON.parse(trimmed);
      const result = PageExportSchema.safeParse(raw);
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? 'Invalid format';
        return { status: 'error', message: `Schema error: ${msg}` };
      }
      return { status: 'valid', data: result.data as PageExport };
    } catch {
      return { status: 'error', message: 'Invalid JSON — check for syntax errors' };
    }
  }, [text]);

  const preview = useMemo(() => {
    if (parsed.status !== 'valid') return null;
    const { nodes, edges } = parsed.data;

    let newNodes = 0;
    let reuseNodes = 0;
    for (const n of nodes) {
      if (n.id && existingNodes.some((e) => e.id === n.id)) reuseNodes++;
      else newNodes++;
    }

    let newEdges = 0;
    let skipEdges = 0;
    for (const edge of edges) {
      if (
        existingEdges.some(
          (e) =>
            (e.source === edge.source && e.target === edge.target) ||
            (e.source === edge.target && e.target === edge.source),
        )
      )
        skipEdges++;
      else newEdges++;
    }

    return { newNodes, reuseNodes, newEdges, skipEdges };
  }, [parsed, existingNodes, existingEdges]);

  async function handleImport() {
    if (parsed.status !== 'valid' || !pageId || !projectId) return;
    setImporting(true);
    setImportError(null);

    const { page, nodes, edges } = parsed.data;

    try {
      // Merge page labels (add ones that don't exist by name)
      const currentLabels = useCanvasStore.getState().pageLabels;
      const newLabels = page.labels.filter(
        (l) => !currentLabels.some((cl) => cl.name === l.name),
      );
      newLabels.forEach((l) => addPageLabel(l));

      // Merge page relations
      const currentRelations = useCanvasStore.getState().pageRelations;
      const newRelations = page.relations.filter((r) => !currentRelations.includes(r));
      newRelations.forEach((r) => addPageRelation(r));

      // Process nodes — build ID map: importedId → actual canvas ID
      const idMap = new Map<string, string>();

      for (const node of nodes) {
        // Check if a perfectly matching node (by ID) already exists on this page
        const alreadyExists =
          node.id && useCanvasStore.getState().nodes.some((n) => n.id === node.id);

        if (alreadyExists) {
          // Build upon the existing node — don't recreate it
          idMap.set(node.id, node.id);
          continue;
        }

        // Create new node (server assigns a fresh ID)
        const res = await api.createNode(pageId, {
          type: node.type,
          name: node.name,
          labels: node.labels,
          size: node.size,
          positions: node.positions,
        });

        // Track the mapping so edges can find the right IDs
        if (node.id) {
          idMap.set(node.id, res.data.id);
        }

        applyRemoteNodeCreated({
          id: res.data.id,
          type: res.data.type,
          name: res.data.name,
          labels: res.data.labels,
          size: res.data.size,
          positions: res.data.positions,
        });
      }

      // Process edges — resolve IDs through the map, skip duplicates
      for (const edge of edges) {
        const sourceId = idMap.get(edge.source) ?? edge.source;
        const targetId = idMap.get(edge.target) ?? edge.target;

        const alreadyExists = useCanvasStore.getState().edges.some(
          (e) =>
            (e.source === sourceId && e.target === targetId) ||
            (e.source === targetId && e.target === sourceId),
        );
        if (alreadyExists) continue;

        const res = await api.createEdge(pageId, {
          source: sourceId,
          target: targetId,
          weight: edge.weight,
          relation: edge.relation,
        });

        applyRemoteEdgeCreated({
          id: res.data.id,
          source: res.data.source,
          target: res.data.target,
          weight: res.data.weight,
          relation: res.data.relation,
        });
      }

      setDone(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

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
          <h2 className="text-sm font-semibold text-gray-900">Import Data</h2>
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
          {!done ? (
            <>
              <p className="text-xs text-gray-500">
                Paste exported page JSON below. Nodes that already exist on this page
                (matched by ID) will be reused — their edges and properties stay intact.
                Nodes without an ID, or with an unrecognised ID, will be created fresh.
              </p>

              <textarea
                className="h-44 w-full resize-none rounded border border-border bg-white px-3 py-2 font-mono text-xs text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder={'{\n  "version": 1,\n  "page": { ... },\n  "nodes": [ ... ],\n  "edges": [ ... ]\n}'}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setImportError(null);
                }}
                spellCheck={false}
              />

              {parsed.status === 'error' && (
                <p className="text-xs text-red-500">{parsed.message}</p>
              )}

              {preview && (
                <div className="rounded border border-border bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
                  <div className="mb-1.5 font-medium text-gray-800">Preview</div>
                  <div className="space-y-0.5">
                    <div>
                      Nodes to create:{' '}
                      <span className="font-medium text-gray-900">{preview.newNodes}</span>
                    </div>
                    {preview.reuseNodes > 0 && (
                      <div>
                        Nodes already on page (will reuse):{' '}
                        <span className="font-medium text-gray-900">{preview.reuseNodes}</span>
                      </div>
                    )}
                    <div>
                      Edges to create:{' '}
                      <span className="font-medium text-gray-900">{preview.newEdges}</span>
                    </div>
                    {preview.skipEdges > 0 && (
                      <div>
                        Edges already on page (will skip):{' '}
                        <span className="font-medium text-gray-900">{preview.skipEdges}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {importError && (
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {importError}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-sm text-gray-700">
              <svg
                className="h-8 w-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="font-medium">Import complete</p>
              <p className="text-xs text-gray-400">The canvas has been updated.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          {!done ? (
            <>
              <button
                onClick={onClose}
                className="rounded px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={parsed.status !== 'valid' || importing}
                className="rounded bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {importing ? 'Importing…' : 'Import'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="rounded bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
