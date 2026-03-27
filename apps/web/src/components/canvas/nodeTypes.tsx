import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

export type NodeData = {
  name: string;
  size: number;
  dimmed?: boolean;
  lockedBy?: string;    // userId of lock holder (only set when locked by another user)
  lockedColor?: string; // display color of the lock holder
};

// Element node — circle
export const ElementNode = memo(function ElementNode({
  data,
  selected,
}: NodeProps) {
  const d = data as NodeData;
  const diameter = Math.round(40 + d.size * 20);
  const opacity = d.dimmed ? 0.2 : 1;
  const isLocked = !!d.lockedBy;

  return (
    <div
      style={{
        width: diameter,
        height: diameter,
        opacity,
        position: 'relative',
        ...(isLocked ? { borderColor: d.lockedColor } : {}),
      }}
      className={[
        'flex items-center justify-center rounded-full border-2 bg-white text-center cursor-pointer',
        isLocked
          ? 'border-dashed'
          : selected
            ? 'border-blue-500 shadow-lg'
            : 'border-gray-700',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0 hover:opacity-100"
      />
      <span
        className="leading-tight font-medium text-gray-800 px-1 break-words text-center"
        style={{ fontSize: Math.max(9, Math.round(11 * d.size)) }}
      >
        {d.name}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0 hover:opacity-100"
      />
      {isLocked && (
        <div
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white font-bold"
          style={{ backgroundColor: d.lockedColor ?? '#888' }}
          title={`Locked by ${d.lockedBy}`}
        >
          🔒
        </div>
      )}
    </div>
  );
});

// Proposition node — rounded rectangle
export const PropositionNode = memo(function PropositionNode({
  data,
  selected,
}: NodeProps) {
  const d = data as NodeData;
  const opacity = d.dimmed ? 0.2 : 1;
  const fontSize = Math.max(9, Math.round(11 * d.size));
  const isLocked = !!d.lockedBy;

  return (
    <div
      style={{
        opacity,
        minWidth: 100,
        maxWidth: 180,
        position: 'relative',
        ...(isLocked ? { borderColor: d.lockedColor } : {}),
      }}
      className={[
        'flex items-center justify-center rounded-lg border-2 bg-amber-50 px-3 py-2 cursor-pointer',
        isLocked
          ? 'border-dashed'
          : selected
            ? 'border-amber-500 shadow-lg'
            : 'border-amber-700',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="opacity-0 hover:opacity-100"
      />
      <span
        className="leading-snug font-medium text-amber-900 text-center break-words"
        style={{ fontSize }}
      >
        {d.name}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0 hover:opacity-100"
      />
      {isLocked && (
        <div
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white font-bold"
          style={{ backgroundColor: d.lockedColor ?? '#888' }}
          title={`Locked by ${d.lockedBy}`}
        >
          🔒
        </div>
      )}
    </div>
  );
});

export const nodeTypes = {
  element: ElementNode,
  proposition: PropositionNode,
};
