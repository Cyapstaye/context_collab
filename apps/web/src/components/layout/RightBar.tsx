import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Chrome } from '@uiw/react-color';
import type { ColorResult } from '@uiw/react-color';
import { useCanvasStore } from '../../store/canvasStore';
import { useRealtimeStore } from '../../store/realtimeStore';
import { useAuthStore } from '../../store/authStore';
import type { LabelDef } from '@context-collab/shared';
import { parseRelation, encodeRelation } from '../../lib/connectionTypes';
import type { ConnType, ConnDir } from '../../lib/connectionTypes';

// ── Color picker popover ───────────────────────────────────────────────────────

interface ColorPickerPopoverProps {
  labelName: string;
  style?: React.CSSProperties;
  onConfirm: (color: string) => void;
  onCancel: () => void;
}

function ColorPickerPopover({ labelName, style, onConfirm, onCancel }: ColorPickerPopoverProps) {
  const [color, setColor] = useState('#6366f1');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCancel]);

  return (
    <div
      ref={ref}
      className="rounded-lg shadow-xl border border-border bg-white p-3"
      style={{ minWidth: 240, ...style }}
    >
      <p className="text-xs text-gray-500 mb-2">
        Pick a color for <span className="font-semibold text-gray-700">"{labelName}"</span>
      </p>
      <Chrome
        color={color}
        onChange={(c: ColorResult) => setColor(c.hex)}
        style={{ width: '100%', boxShadow: 'none', border: 'none' }}
      />
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => onConfirm(color)}
          className="flex-1 rounded bg-blue-600 px-3 py-1 text-xs text-white font-medium hover:bg-blue-700"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1 text-xs text-gray-500 hover:text-gray-700 border border-border"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Labels combobox ───────────────────────────────────────────────────────────
// Multi-value: shows chips for current labels, input to add more

interface LabelsComboboxProps {
  labels: string[];
  pageLabels: LabelDef[];
  disabled?: boolean;
  onChange: (labels: string[]) => void;
  onNewLabel: (label: LabelDef) => void;
}

function LabelsCombobox({ labels, pageLabels, disabled, onChange, onNewLabel }: LabelsComboboxProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  // Portal positioning — recalculated each time dropdown or picker opens
  const [dropPortalStyle, setDropPortalStyle] = useState<React.CSSProperties>({});
  const [pickerPortalStyle, setPickerPortalStyle] = useState<React.CSSProperties>({});

  const suggestions = pageLabels.map((l) => l.name);
  const filtered = suggestions.filter(
    (s) => !labels.includes(s) && s.toLowerCase().includes(input.toLowerCase()),
  );

  function addExistingLabel(name: string) {
    if (labels.includes(name)) return;
    onChange([...labels, name]);
    setInput('');
    setOpen(false);
  }

  function requestNewLabel(name: string) {
    const trimmed = name.trim();
    if (!trimmed || labels.includes(trimmed)) return;
    // If already in page vocabulary (with a color), just add it
    if (pageLabels.some((l) => l.name === trimmed)) {
      addExistingLabel(trimmed);
      return;
    }
    // New label — show color picker
    setOpen(false);
    setPendingLabel(trimmed);
    setInput('');
  }

  function handleColorConfirm(color: string) {
    if (!pendingLabel) return;
    const def: LabelDef = { name: pendingLabel, color };
    onNewLabel(def);
    onChange([...labels, pendingLabel]);
    setPendingLabel(null);
  }

  function handleColorCancel() {
    setPendingLabel(null);
  }

  function removeLabel(label: string) {
    onChange(labels.filter((l) => l !== label));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0 && input) {
        addExistingLabel(filtered[0]);
      } else if (input.trim()) {
        requestNewLabel(input);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Backspace' && !input && labels.length > 0) {
      removeLabel(labels[labels.length - 1]);
    }
  }

  // Recalculate dropdown portal position each time it opens
  useEffect(() => {
    if (open && dropRef.current) {
      const r = dropRef.current.getBoundingClientRect();
      setDropPortalStyle({ position: 'fixed', top: r.bottom + 2, left: r.left, width: r.width, zIndex: 9999 });
    }
  }, [open]);

  // Recalculate color picker portal position each time it appears
  useEffect(() => {
    if (pendingLabel !== null && dropRef.current) {
      const r = dropRef.current.getBoundingClientRect();
      setPickerPortalStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, zIndex: 9999 });
    }
  }, [pendingLabel]);

  // Close dropdown on outside click (but not if color picker is open)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function getLabelColor(name: string): string | undefined {
    return pageLabels.find((l) => l.name === name)?.color;
  }

  return (
    <div ref={dropRef} className="relative">
      <div
        className={[
          'flex flex-wrap gap-1 rounded border px-2 py-1 min-h-[30px] cursor-text',
          disabled ? 'border-border bg-gray-50' : 'border-border bg-white focus-within:border-blue-400',
        ].join(' ')}
        onClick={() => { if (!disabled) inputRef.current?.focus(); }}
      >
        {labels.map((l) => {
          const color = getLabelColor(l);
          return (
            <span
              key={l}
              className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
            >
              {color && (
                <span
                  className="rounded-full inline-block flex-shrink-0"
                  style={{ width: 6, height: 6, backgroundColor: color }}
                />
              )}
              {l}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeLabel(l); }}
                  className="ml-0.5 opacity-60 hover:opacity-100 leading-none"
                  aria-label={`Remove ${l}`}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
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

      {open && !disabled && (filtered.length > 0 || input.trim()) && createPortal(
        <ul style={dropPortalStyle} className="rounded border border-border bg-white shadow-md max-h-40 overflow-y-auto">
          {filtered.map((s) => {
            const color = getLabelColor(s);
            return (
              <li
                key={s}
                onMouseDown={(e) => { e.preventDefault(); addExistingLabel(s); }}
                className="cursor-pointer px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5"
              >
                {color
                  ? <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, backgroundColor: color, display: 'inline-block' }} />
                  : <span className="rounded-full flex-shrink-0 border border-gray-300" style={{ width: 8, height: 8, display: 'inline-block' }} />
                }
                {s}
              </li>
            );
          })}
          {input.trim() && !suggestions.includes(input.trim()) && !labels.includes(input.trim()) && (
            <li
              onMouseDown={(e) => { e.preventDefault(); requestNewLabel(input.trim()); }}
              className="cursor-pointer px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 italic"
            >
              + Add "{input.trim()}"
            </li>
          )}
        </ul>,
        document.body
      )}

      {pendingLabel !== null && createPortal(
        <ColorPickerPopover
          labelName={pendingLabel}
          style={pickerPortalStyle}
          onConfirm={handleColorConfirm}
          onCancel={handleColorCancel}
        />,
        document.body
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

// ── ConnectionTypePicker ───────────────────────────────────────────────────────

const CONN_TYPES: { value: ConnType; label: string; svg: React.ReactNode }[] = [
  {
    value: '',
    label: 'None',
    svg: (
      <svg width="24" height="10" viewBox="0 0 24 10">
        <line x1="2" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    value: 'positive',
    label: 'Positive',
    svg: (
      <svg width="24" height="10" viewBox="0 0 24 10">
        <line x1="2" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.5" />
        <polygon points="17,2 23,5 17,8" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: 'negative',
    label: 'Negative',
    svg: (
      <svg width="24" height="10" viewBox="0 0 24 10">
        <line x1="4"  y1="9" x2="8"  y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="9" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="9" x2="20" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'resonate',
    label: 'Resonate',
    svg: (
      <svg width="24" height="10" viewBox="0 0 24 10">
        <polygon points="7,2 1,5 7,8" fill="currentColor" />
        <line x1="7" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.5" />
        <polygon points="17,2 23,5 17,8" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: 'offset',
    label: 'Offset',
    svg: (
      <svg width="24" height="10" viewBox="0 0 24 10">
        <polyline points="7,2 1,5 7,8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="7" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
        <polyline points="17,2 23,5 17,8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

const DIRECTIONS: { value: ConnDir; label: string }[] = [
  { value: 'forward',  label: '→' },
  { value: 'backward', label: '←' },
  { value: 'both',     label: '↔' },
];

function ConnectionTypePicker({
  relation,
  disabled,
  onChange,
}: {
  relation: string;
  disabled?: boolean;
  onChange: (relation: string) => void;
}) {
  const { type, dir } = parseRelation(relation);
  const hasDir = type === 'positive' || type === 'negative';

  function setType(t: ConnType) {
    const newDir = hasDir ? dir : 'forward';
    onChange(encodeRelation(t, newDir));
  }

  function setDir(d: ConnDir) {
    onChange(encodeRelation(type, d));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {CONN_TYPES.map((t) => (
          <button
            key={t.value}
            disabled={disabled}
            onClick={() => setType(t.value)}
            className={[
              'flex flex-col items-center gap-1 rounded border px-2 py-1.5 text-[10px] leading-none transition-colors',
              type === t.value
                ? 'border-gray-400 bg-gray-100 text-gray-800'
                : 'border-border text-gray-400 hover:bg-gray-50 hover:text-gray-700',
            ].join(' ')}
          >
            {t.svg}
            {t.label}
          </button>
        ))}
      </div>

      {hasDir && (
        <div className="flex gap-1">
          {DIRECTIONS.map((d) => (
            <button
              key={d.value}
              disabled={disabled}
              onClick={() => setDir(d.value)}
              className={[
                'rounded border px-3 py-0.5 text-sm transition-colors',
                dir === d.value
                  ? 'border-gray-400 bg-gray-100 text-gray-800'
                  : 'border-border text-gray-400 hover:bg-gray-50',
              ].join(' ')}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RightBar ──────────────────────────────────────────────────────────────────

export default function RightBar() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const pageLabels = useCanvasStore((s) => s.pageLabels);
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

  const nodeLocks = useRealtimeStore((s) => s.nodeLocks);
  const presenceUsers = useRealtimeStore((s) => s.presenceUsers);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const isViewOnly = useAuthStore((s) => s.isViewOnly());

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  // Resolve source/target names for edge display
  const edgeSource = selectedEdge ? nodes.find((n) => n.id === selectedEdge.source) : null;
  const edgeTarget = selectedEdge ? nodes.find((n) => n.id === selectedEdge.target) : null;

  // Is the selected node locked by another user?
  const lockedByUserId = selectedNodeId ? nodeLocks[selectedNodeId] : undefined;
  const isLockedByOther = !!lockedByUserId && lockedByUserId !== currentUserId;
  const lockerUser = isLockedByOther
    ? presenceUsers.find((u) => u.userId === lockedByUserId)
    : null;

  const isOpen = !!(selectedNode || selectedEdge);

  return (
    <aside
      className={[
        'absolute right-3 top-3 bottom-3 w-64 z-30',
        'flex flex-col rounded-xl overflow-hidden bg-panel shadow-2xl',
        'transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+0.75rem)]',
      ].join(' ')}
    >
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium text-gray-500">Properties</p>
      </div>

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
            {!isLockedByOther && !isViewOnly && (
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
              disabled={isLockedByOther || isViewOnly}
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
              disabled={isLockedByOther || isViewOnly}
            />
          </label>

          <div>
            <span className="text-xs text-gray-500 block mb-1">Labels</span>
            <LabelsCombobox
              labels={selectedNode.labels}
              pageLabels={pageLabels}
              disabled={isLockedByOther || isViewOnly}
              onChange={(labels) => updateNodeLabels(selectedNode.id, labels)}
              onNewLabel={(label) => addPageLabel(label)}
            />
          </div>

          <div>
            <span className="text-xs text-gray-500">ID</span>
            <p className="mt-0.5 text-xs text-gray-400 font-mono">{selectedNode.id}</p>
          </div>

          {/* Connections */}
          {(() => {
            const nodeEdges = edges.filter(
              (e) => e.source === selectedNode.id || e.target === selectedNode.id,
            );
            if (nodeEdges.length === 0) return null;
            return (
              <div>
                <span className="text-xs text-gray-500 block mb-1.5">Connections</span>
                <div className="space-y-1">
                  {nodeEdges.map((e) => {
                    const isSource = e.source === selectedNode.id;
                    const otherId = isSource ? e.target : e.source;
                    const otherNode = nodes.find((n) => n.id === otherId);
                    const { type, dir } = parseRelation(e.relation);
                    const typeLabel = CONN_TYPES.find((t) => t.value === type)?.label ?? 'None';
                    const hasDir = type === 'positive' || type === 'negative';
                    const dirSymbol = hasDir
                      ? (DIRECTIONS.find((d) => d.value === dir)?.label ?? '→')
                      : null;
                    return (
                      <div
                        key={e.id}
                        className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1.5"
                      >
                        <span
                          className="text-xs text-gray-700 truncate"
                          title={otherNode?.name ?? otherId}
                        >
                          {otherNode?.name ?? otherId}
                        </span>
                        <span className="shrink-0 text-[10px] text-gray-400 flex items-center gap-0.5">
                          {typeLabel}
                          {dirSymbol && (
                            <span className="ml-0.5 font-medium text-gray-500">{dirSymbol}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {selectedEdge && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
              Edge
            </span>
            {!isViewOnly && (
              <button
                onClick={() => deleteEdge(selectedEdge.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Delete
              </button>
            )}
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
              min="0.1"
              max="1.2"
              step="0.05"
              className="mt-1 w-full"
              value={selectedEdge.weight}
              onChange={(e) => updateEdgeWeight(selectedEdge.id, parseFloat(e.target.value))}
              disabled={isViewOnly}
            />
          </label>

          <div>
            <span className="text-xs text-gray-500 block mb-1">Connection type</span>
            <ConnectionTypePicker
              relation={selectedEdge.relation}
              disabled={isViewOnly}
              onChange={(relation) => updateEdgeRelation(selectedEdge.id, relation)}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
