import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useDesignStore } from '../../store/designStore';
import { useCanvasStore } from '../../store/canvasStore';

export type NodeData = {
  name: string;
  size: number;
  dimmed?: boolean;
  crossType?: boolean;  // True when shown as context in a different view (detail view mix)
  lockedBy?: string;    // userId of lock holder (only set when locked by another user)
  lockedColor?: string; // display color of the lock holder
  labelColors?: string[]; // hex colors for each label that has a color assigned
  isWaypoint?: boolean; // True when this node is the active Option-click chain waypoint
  labelFocusColor?: string;  // set when a label is focused — use this color for border + glow
  showNameOverlay?: boolean; // always show name as floating text over the compact node
};

// Must match tailwind.config.ts canvas color
const CANVAS_BG = '#f8f8f6';

function LabelDots({ colors, diameter }: { colors: string[]; diameter?: number }) {
  const ds = useDesignStore((s) => s.settings);
  if (colors.length === 0) return null;

  if (diameter !== undefined) {
    const r = diameter / 2;
    const outerR = r + ds.arcGap + ds.arcDotSize / 2;
    const n = colors.length;
    return (
      <>
        {colors.map((color, i) => {
          const angleDeg = (i - (n - 1) / 2) * ds.arcAngleStep;
          const angleRad = (angleDeg * Math.PI) / 180;
          const cx = r + outerR * Math.cos(angleRad) - ds.arcDotSize / 2;
          const cy = r + outerR * Math.sin(angleRad) - ds.arcDotSize / 2;
          return (
            <div
              key={i}
              className="absolute rounded-full border border-white shadow-sm"
              style={{ width: ds.arcDotSize, height: ds.arcDotSize, backgroundColor: color, left: cx, top: cy, pointerEvents: 'none' }}
            />
          );
        })}
      </>
    );
  }

  return (
    <div
      className="absolute flex flex-col items-center gap-0.5"
      style={{ right: -(ds.arcDotSize / 2 + 3), top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
    >
      {colors.map((color, i) => (
        <div
          key={i}
          className="rounded-full border border-white shadow-sm"
          style={{ width: ds.arcDotSize, height: ds.arcDotSize, backgroundColor: color, flexShrink: 0 }}
        />
      ))}
    </div>
  );
}

// ── Inline name editor (used inside both node types) ──────────────────────────
function InlineNameInput({
  nodeId,
  initialName,
  style,
}: {
  nodeId: string;
  initialName: string;
  style?: React.CSSProperties;
}) {
  const updateNodeName = useCanvasStore((s) => s.updateNodeName);
  const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId);
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  // Keep latest value in a ref so onBlur always sees the current value
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function commit() {
    const trimmed = valueRef.current.trim();
    if (trimmed && trimmed !== initialName) {
      updateNodeName(nodeId, trimmed);
    }
    setEditingNodeId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); setEditingNodeId(null); }
  }

  return (
    <input
      ref={inputRef}
      className="nodrag nopan bg-transparent outline-none text-center w-full"
      style={style}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}

// ── Element node — circle ──────────────────────────────────────────────────────
export const ElementNode = memo(function ElementNode({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as NodeData;
  const [hovered, setHovered] = useState(false);
  const diameter = Math.max(6, Math.round((40 + d.size * 20) * 0.3));
  const contentOpacity = d.dimmed ? 0.2 : d.crossType ? 0.55 : 1;
  const isLocked = !!d.lockedBy;
  const isWaypoint = !!d.isWaypoint;
  const isDashed = isLocked || !!d.crossType;

  const ds = useDesignStore((s) => s.settings);
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const isEditing = id === editingNodeId && !d.dimmed && !isLocked;
  const borderWidth = isLocked ? 2 : isWaypoint ? 3 : (selected || d.labelFocusColor) ? ds.selectedBorderWidth : ds.defaultBorderWidth;
  const borderColor = isLocked
    ? (d.lockedColor ?? '#888')
    : isWaypoint
      ? '#f97316'
      : d.crossType
        ? '#d1d5db'
        : d.labelFocusColor
          ? d.labelFocusColor
          : selected
            ? ds.selectedBorderColor
            : ds.defaultBorderColor;
  const fontWeight = selected ? ds.selectedFontWeight : ds.defaultFontWeight;

  const outerShadow = isWaypoint
    ? 'shadow-lg shadow-orange-200'
    : d.labelFocusColor
      ? undefined  // applied inline so we can use the dynamic color
      : selected
        ? 'shadow-[0_0_3px_rgba(0,0,0,0.10),0_0_10px_rgba(0,0,0,0.09),0_0_28px_rgba(0,0,0,0.07),0_0_56px_rgba(0,0,0,0.04)]'
        : '';

  return (
    // Outer wrapper: fixed size + rounded shape for shadow; NO opacity so shield stays opaque
    <div
      style={{
        width: diameter, height: diameter, position: 'relative',
        overflow: 'visible',
        ...(d.labelFocusColor ? { boxShadow: `0 0 6px 2px ${d.labelFocusColor}40, 0 0 20px 4px ${d.labelFocusColor}25` } : {}),
      }}
      className={['rounded-full cursor-pointer', outerShadow ?? ''].join(' ')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Canvas-bg shield — always fully opaque; masks edge SVG lines behind this node */}
      <div className="absolute inset-0 rounded-full" style={{ backgroundColor: CANVAS_BG }} />

      {/* Visual ring + content — opacity only here; inset box-shadow = inner border */}
      <div
        className="absolute inset-0 rounded-full bg-white flex items-center justify-center text-center"
        style={{
          opacity: contentOpacity,
          ...(isDashed
            ? { border: `${borderWidth}px dashed ${borderColor}` }
            : { boxShadow: `inset 0 0 0 ${borderWidth}px ${borderColor}` }),
        }}
      >
        {/* Handles at center — edges draw center-to-center, node bg visually trims the line */}
        <Handle
          type="target"
          position={Position.Top}
          style={{ opacity: 0, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ opacity: 0, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
        {(d.showNameOverlay || hovered || selected) && (
          <div
            className="pointer-events-none"
            style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              whiteSpace: 'nowrap',
              fontSize: 11,
              fontWeight: 500,
              color: borderColor,
              zIndex: 50,
            }}
          >
            {d.name}
          </div>
        )}
        {isLocked && (
          <div
            className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white font-bold"
            style={{ backgroundColor: d.lockedColor ?? '#888' }}
            title={`Locked by ${d.lockedBy}`}
          >
            🔒
          </div>
        )}
        {!isLocked && d.labelColors && <LabelDots colors={d.labelColors} diameter={diameter} />}
        {isWaypoint && (
          <div
            className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white font-bold"
            style={{ backgroundColor: '#f97316' }}
            title="Option-click waypoint"
          >
            ⌥
          </div>
        )}
      </div>
    </div>
  );
});

// ── Proposition node — rounded rectangle ──────────────────────────────────────
export const PropositionNode = memo(function PropositionNode({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as NodeData;
  const [hovered, setHovered] = useState(false);
  const contentOpacity = d.dimmed ? 0.2 : d.crossType ? 0.55 : 1;
  const fontSize = Math.max(9, Math.round(11 * d.size));
  const isLocked = !!d.lockedBy;
  const isWaypoint = !!d.isWaypoint;
  const isDashed = isLocked || !!d.crossType;

  const ds = useDesignStore((s) => s.settings);
  const editingNodeId = useCanvasStore((s) => s.editingNodeId);
  const isEditing = id === editingNodeId && !d.dimmed && !isLocked;
  const borderWidth = isLocked ? 2 : isWaypoint ? 3 : (selected || d.labelFocusColor) ? ds.selectedBorderWidth : ds.defaultBorderWidth;
  const borderColor = isLocked
    ? (d.lockedColor ?? '#888')
    : isWaypoint
      ? '#f97316'
      : d.crossType
        ? '#d1d5db'
        : d.labelFocusColor
          ? d.labelFocusColor
          : selected
            ? ds.selectedBorderColor
            : ds.defaultBorderColor;
  const fontWeight = selected ? ds.selectedFontWeight : ds.defaultFontWeight;

  const outerShadow = isWaypoint
    ? 'shadow-lg shadow-orange-200'
    : d.labelFocusColor
      ? undefined
      : selected
        ? 'shadow-[0_0_3px_rgba(0,0,0,0.10),0_0_10px_rgba(0,0,0,0.09),0_0_28px_rgba(0,0,0,0.07),0_0_56px_rgba(0,0,0,0.04)]'
        : '';

  return (
    // Outer wrapper: content-sized, rounded shape for shadow; NO opacity so shield stays opaque
    <div
      style={{
        position: 'relative',
        width: 12, height: 12, minWidth: 0, maxWidth: 'none', overflow: 'visible',
        ...(d.labelFocusColor ? { boxShadow: `0 0 6px 2px ${d.labelFocusColor}40, 0 0 20px 4px ${d.labelFocusColor}25` } : {}),
      }}
      className={['rounded-lg cursor-pointer', outerShadow ?? ''].join(' ')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Canvas-bg shield */}
      <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: CANVAS_BG }} />

      {/* Visual ring + content */}
      <div
        className="relative w-full rounded-lg bg-white flex items-center justify-center"
        style={{
          opacity: contentOpacity,
          ...(isDashed
            ? { border: `${borderWidth}px dashed ${borderColor}` }
            : { boxShadow: `inset 0 0 0 ${borderWidth}px ${borderColor}` }),
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          style={{ opacity: 0, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ opacity: 0, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
        {(d.showNameOverlay || hovered || selected) && (
          <div
            className="pointer-events-none"
            style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              whiteSpace: 'nowrap',
              fontSize: 11,
              fontWeight: 500,
              color: borderColor,
              zIndex: 50,
            }}
          >
            {d.name}
          </div>
        )}
        {isLocked && (
          <div
            className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white font-bold"
            style={{ backgroundColor: d.lockedColor ?? '#888' }}
            title={`Locked by ${d.lockedBy}`}
          >
            🔒
          </div>
        )}
        {!isLocked && d.labelColors && <LabelDots colors={d.labelColors} />}
        {isWaypoint && (
          <div
            className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white font-bold"
            style={{ backgroundColor: '#f97316' }}
            title="Option-click waypoint"
          >
            ⌥
          </div>
        )}
      </div>
    </div>
  );
});

export const nodeTypes = {
  element: ElementNode,
  proposition: PropositionNode,
};
