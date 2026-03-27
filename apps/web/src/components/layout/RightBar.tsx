import { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useRealtimeStore } from '../../store/realtimeStore';
import { userIdentity } from '../../lib/socket';

// ── Labels combobox ───────────────────────────────────────────────────────────
// Multi-value: shows chips for current labels, input to add more
interface LabelsComboboxProps {
  labels: string[];
  suggestions: string[];
  disabled?: boolean;
  onChange: (labels: string[]) => void;
  onNewLabel: (label: string) => void;
}

function LabelsCombobox({ labels, suggestions, disabled, onChange, onNewLabel }: LabelsComboboxProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(
    (s) => !labels.includes(s) && s.toLowerCase().includes(input.toLowerCase()),
  );

  function addLabel(label: string) {
    const trimmed = label.trim();
    if (!trimmed || labels.includes(trimmed)) return;
    onNewLabel(trimmed);
    onChange([...labels, trimmed]);
    setInput('');
  }

  function removeLabel(label: string) {
    onChange(labels.filter((l) => l !== label));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0 && input) {
        addLabel(filtered[0]);
      } else if (input.trim()) {
        addLabel(input);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Backspace' && !input && labels.length > 0) {
      removeLabel(labels[labels.length - 1]);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={dropRef} className="relative">
      <div
        className={[
          'flex flex-wrap gap-1 rounded border px-2 py-1 min-h-[30px] cursor-text',
          disabled ? 'border-border bg-gray-50' : 'border-border bg-white focus-within:border-blue-400',
        ].join(' ')}
        onClick={() => { if (!disabled) inputRef.current?.focus(); }}
      >
        {labels.map((l) => (
          <span
            key={l}
            className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 font-medium"
          >
            {l}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeLabel(l); }}
                className="ml-0.5 text-blue-400 hover:text-blue-700 leading-none"
                aria-label={`Remove ${l}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={labels.length === 0 ? 'Add label...' : ''}
            className="flex-1 min-w-[60px] text-xs outline-none bg-transparent py-0.5"
          />
        )}
      </div>

      {open && !disabled && (filtered.length > 0 || input.trim()) && (
        <ul className="absolute z-50 mt-0.5 w-full rounded border border-border bg-white shadow-md max-h-40 overflow-y-auto">
          {filtered.map((s) => (
            <li
              key={s}
              onMouseDown={(e) => { e.preventDefault(); addLabel(s); }}
              className="cursor-pointer px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
            >
              {s}
            </li>
          ))}
          {input.trim() && !suggestions.includes(input.trim()) && !labels.includes(input.trim()) && (
            <li
              onMouseDown={(e) => { e.preventDefault(); addLabel(input.trim()); }}
              className="cursor-pointer px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 italic"
            >
              + Add "{input.trim()}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ── Relation combobox ─────────────────────────────────────────────────────────
// Single-value: text input with suggestions dropdown
interface RelationComboboxProps {
  value: string;
  suggestions: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
  onNewRelation: (value: string) => void;
}

function RelationCombobox({ value, suggestions, disabled, onChange, onNewRelation }: RelationComboboxProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()),
  );

  function select(relation: string) {
    onChange(relation);
    onNewRelation(relation);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        select(filtered[0]);
      } else if (value.trim()) {
        onNewRelation(value.trim());
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleBlur() {
    // Delay so click on dropdown item fires first
    setTimeout(() => setOpen(false), 150);
    if (value.trim()) onNewRelation(value.trim());
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={dropRef} className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="e.g. influences, causes..."
        disabled={disabled}
        className="w-full rounded border border-border px-2 py-1 text-sm outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
      />
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-50 mt-0.5 w-full rounded border border-border bg-white shadow-md max-h-40 overflow-y-auto">
          {filtered.map((s) => (
            <li
              key={s}
              onMouseDown={(e) => { e.preventDefault(); select(s); }}
              className="cursor-pointer px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── RightBar ──────────────────────────────────────────────────────────────────

export default function RightBar() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const pageLabels = useCanvasStore((s) => s.pageLabels);
  const pageRelations = useCanvasStore((s) => s.pageRelations);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const updateNodeName = useCanvasStore((s) => s.updateNodeName);
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize);
  const updateNodeLabels = useCanvasStore((s) => s.updateNodeLabels);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const updateEdgeWeight = useCanvasStore((s) => s.updateEdgeWeight);
  const updateEdgeRelation = useCanvasStore((s) => s.updateEdgeRelation);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);
  const addPageLabel = useCanvasStore((s) => s.addPageLabel);
  const addPageRelation = useCanvasStore((s) => s.addPageRelation);

  const nodeLocks = useRealtimeStore((s) => s.nodeLocks);
  const presenceUsers = useRealtimeStore((s) => s.presenceUsers);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  // Resolve source/target names for edge display
  const edgeSource = selectedEdge ? nodes.find((n) => n.id === selectedEdge.source) : null;
  const edgeTarget = selectedEdge ? nodes.find((n) => n.id === selectedEdge.target) : null;

  // Is the selected node locked by another user?
  const lockedByUserId = selectedNodeId ? nodeLocks[selectedNodeId] : undefined;
  const isLockedByOther = !!lockedByUserId && lockedByUserId !== userIdentity.userId;
  const lockerUser = isLockedByOther
    ? presenceUsers.find((u) => u.userId === lockedByUserId)
    : null;

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-l border-border bg-panel">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium text-gray-500">Properties</p>
      </div>

      {!selectedNode && !selectedEdge && (
        <div className="flex flex-1 items-center justify-center px-4">
          <p className="text-center text-xs text-gray-400">
            Select a node or edge to<br />view and edit its properties.
          </p>
        </div>
      )}

      {selectedNode && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className={[
              'rounded px-2 py-0.5 text-xs font-medium',
              selectedNode.type === 'element'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700',
            ].join(' ')}>
              {selectedNode.type === 'element' ? 'Element' : 'Proposition'}
            </span>
            {!isLockedByOther && (
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Delete
              </button>
            )}
          </div>

          {isLockedByOther && (
            <div
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs"
              style={{
                backgroundColor: (lockerUser?.color ?? '#888') + '22',
                borderLeft: `3px solid ${lockerUser?.color ?? '#888'}`,
              }}
            >
              <span style={{ color: lockerUser?.color ?? '#888' }}>
                🔒 {lockerUser?.email ?? lockedByUserId} editing
              </span>
            </div>
          )}

          <label className="block">
            <span className="text-xs text-gray-500">Name</span>
            <input
              className="mt-1 w-full rounded border border-border px-2 py-1 text-sm outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
              value={selectedNode.name}
              onChange={(e) => updateNodeName(selectedNode.id, e.target.value)}
              disabled={isLockedByOther}
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">Size — {selectedNode.size.toFixed(1)}</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              className="mt-1 w-full disabled:opacity-40"
              value={selectedNode.size}
              onChange={(e) => updateNodeSize(selectedNode.id, parseFloat(e.target.value))}
              disabled={isLockedByOther}
            />
          </label>

          <div>
            <span className="text-xs text-gray-500 block mb-1">Labels</span>
            <LabelsCombobox
              labels={selectedNode.labels}
              suggestions={pageLabels}
              disabled={isLockedByOther}
              onChange={(labels) => updateNodeLabels(selectedNode.id, labels)}
              onNewLabel={(label) => addPageLabel(label)}
            />
          </div>

          <div>
            <span className="text-xs text-gray-500">ID</span>
            <p className="mt-0.5 text-xs text-gray-400 font-mono">{selectedNode.id}</p>
          </div>
        </div>
      )}

      {selectedEdge && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
              Edge
            </span>
            <button
              onClick={() => deleteEdge(selectedEdge.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Delete
            </button>
          </div>

          <div>
            <span className="text-xs text-gray-500">Connection</span>
            <p className="mt-0.5 text-xs text-gray-600">
              {edgeSource?.name ?? selectedEdge.source}
              {' → '}
              {edgeTarget?.name ?? selectedEdge.target}
            </p>
          </div>

          <label className="block">
            <span className="text-xs text-gray-500">Weight — {selectedEdge.weight.toFixed(2)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              className="mt-1 w-full"
              value={selectedEdge.weight}
              onChange={(e) => updateEdgeWeight(selectedEdge.id, parseFloat(e.target.value))}
            />
          </label>

          <div>
            <span className="text-xs text-gray-500 block mb-1">Relation</span>
            <RelationCombobox
              value={selectedEdge.relation}
              suggestions={pageRelations}
              onChange={(relation) => updateEdgeRelation(selectedEdge.id, relation)}
              onNewRelation={(relation) => addPageRelation(relation)}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
