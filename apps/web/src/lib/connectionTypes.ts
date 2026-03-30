import type { Edge as RFEdge } from '@xyflow/react';

export type ConnType = 'positive' | 'negative' | 'resonate' | 'offset' | '';
export type ConnDir  = 'forward' | 'backward' | 'both';

// ── Encode / decode ──────────────────────────────────────────────────────────
// Relation string format:
//   "positive"       → positive influence, A→B
//   "positive-back"  → positive influence, B→A
//   "positive-both"  → positive influence, A↔B
//   "negative"       → negative influence, A→B
//   "negative-back"  → negative influence, B→A
//   "negative-both"  → negative influence, A↔B
//   "resonate"       → resonate (always ↔)
//   "offset"         → offset   (always ↔)
//   ""               → no type
//
// Legacy values ("cause", "influence") are silently remapped on read.

export function parseRelation(relation: string): { type: ConnType; dir: ConnDir } {
  // Map legacy keys to new types
  const REMAP: Record<string, ConnType> = { cause: 'positive', influence: 'negative' };

  for (const base of ['positive', 'negative', 'cause', 'influence'] as const) {
    const canonical = (REMAP[base] ?? base) as ConnType;
    if (relation === base)           return { type: canonical, dir: 'forward' };
    if (relation === `${base}-back`) return { type: canonical, dir: 'backward' };
    if (relation === `${base}-both`) return { type: canonical, dir: 'both' };
  }
  if (relation === 'resonate') return { type: 'resonate', dir: 'both' };
  if (relation === 'offset')   return { type: 'offset',   dir: 'both' };
  return { type: '', dir: 'forward' };
}

export function encodeRelation(type: ConnType, dir: ConnDir): string {
  if (!type) return '';
  if (type === 'resonate' || type === 'offset') return type;
  if (dir === 'backward') return `${type}-back`;
  if (dir === 'both')     return `${type}-both`;
  return type;
}

// ── Visual style mapping ─────────────────────────────────────────────────────

const MAX_WEIGHT = 1.2;

export function edgeVisualProps(relation: string, weight: number): Partial<RFEdge> {
  const opacity = weight / MAX_WEIGHT;
  return { style: { strokeWidth: 1.5, opacity } };
}
