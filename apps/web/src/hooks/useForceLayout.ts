import { useEffect, useRef, useCallback } from "react";
import type { Node as RFNode } from "@xyflow/react";

interface SimEdge {
  source: string;
  target: string;
  weight: number;
}

// ── Tuning constants ────────────────────────────────────────────────────────
const REPEL = 6000; // repulsion strength (larger = more push)
const REPEL_MAX = 400; // repulsion cuts off beyond this distance (px)
// SPRING kept low so the full weight range (0.1–1.2) stays below MAX_V at
// normal working distances, keeping weight=1.0 and weight=1.2 distinguishable.
const SPRING = 0.01; // edge spring coefficient (weight range 0.1–1.2)
const REST = 180; // natural edge length in px
const DAMP = 0.78; // velocity multiplier per tick (< 1 = decay toward rest)
const MAX_V = 30; // velocity clamp — raised so weight > 1.0 is never capped
const MIN_D = 30; // minimum distance to avoid division near zero

export interface ForceConfig {
  /** Natural spring rest length (px). Default: REST (180). Increase for wider nodes. */
  restDistance?: number;
  /** Repulsion cutoff distance (px). Default: REPEL_MAX (400). */
  repelMax?: number;
  /** Repulsion strength multiplier. Default: REPEL (6000). */
  repelStrength?: number;
}

export function useForceLayout(
  edges: SimEdge[],
  setNodes: React.Dispatch<React.SetStateAction<RFNode[]>>,
  frozenIds?: Set<string>,
  config?: ForceConfig,
) {
  const velRef = useRef<Map<string, { vx: number; vy: number }>>(new Map());
  const pinnedRef = useRef<Set<string>>(new Set());
  // Keep edges and frozenIds current without restarting the RAF loop
  const edgesRef = useRef<SimEdge[]>(edges);
  edgesRef.current = edges;
  const frozenRef = useRef<Set<string>>(frozenIds ?? new Set());
  frozenRef.current = frozenIds ?? new Set();
  const configRef = useRef<ForceConfig>(config ?? {});
  configRef.current = config ?? {};

  useEffect(() => {
    let frameId: number;

    const tick = () => {
      setNodes((nds) => {
        if (nds.length < 2) return nds;

        const vels = velRef.current;
        const es = edgesRef.current;
        const pinned = pinnedRef.current;
        const cfg = configRef.current;
        const repelStrength = cfg.repelStrength ?? REPEL;
        const repelMax     = cfg.repelMax     ?? REPEL_MAX;
        const restDistance = cfg.restDistance ?? REST;

        // Sync velocity map: add new nodes, remove gone ones
        nds.forEach((n) => {
          if (!vels.has(n.id)) vels.set(n.id, { vx: 0, vy: 0 });
        });
        vels.forEach((_, id) => {
          if (!nds.some((n) => n.id === id)) vels.delete(id);
        });

        const fx = new Map<string, number>();
        const fy = new Map<string, number>();
        nds.forEach((n) => {
          fx.set(n.id, 0);
          fy.set(n.id, 0);
        });

        // Repulsion — every pair pushes each other away, up to REPEL_MAX distance.
        // Force scales with each node's size (like mass in gravity).
        // Frozen nodes (cross-type context ghosts) are excluded entirely.
        const frozen = frozenRef.current;
        for (let i = 0; i < nds.length; i++) {
          for (let j = i + 1; j < nds.length; j++) {
            const a = nds[i],
              b = nds[j];
            if (frozen.has(a.id) || frozen.has(b.id)) continue;
            const dx = b.position.x - a.position.x;
            const dy = b.position.y - a.position.y;
            const d = Math.hypot(dx, dy);
            if (d > repelMax) continue;
            const dc = Math.max(d, MIN_D);
            const mass =
              ((a.data as { size?: number }).size ?? 1) *
              ((b.data as { size?: number }).size ?? 1);
            const f = (repelStrength * mass) / (dc * dc);
            const ux = dx / dc,
              uy = dy / dc;
            fx.set(a.id, fx.get(a.id)! - ux * f);
            fy.set(a.id, fy.get(a.id)! - uy * f);
            fx.set(b.id, fx.get(b.id)! + ux * f);
            fy.set(b.id, fy.get(b.id)! + uy * f);
          }
        }

        // Attraction — edges act as springs; stronger weight = stronger pull.
        // weight range is 0–1.2; force scales linearly so 1.2 pulls 20% harder than 1.0.
        // Skip edges where either endpoint is frozen (cross-type context node).
        const pos = new Map(nds.map((n) => [n.id, n.position]));
        for (const e of es) {
          if (frozen.has(e.source) || frozen.has(e.target)) continue;
          const pa = pos.get(e.source),
            pb = pos.get(e.target);
          if (!pa || !pb) continue;
          const dx = pb.x - pa.x,
            dy = pb.y - pa.y;
          const d = Math.max(Math.hypot(dx, dy), MIN_D);
          const f = SPRING * (d - restDistance) * e.weight;
          const ux = dx / d,
            uy = dy / d;
          fx.set(e.source, (fx.get(e.source) ?? 0) + ux * f);
          fy.set(e.source, (fy.get(e.source) ?? 0) + uy * f);
          fx.set(e.target, (fx.get(e.target) ?? 0) - ux * f);
          fy.set(e.target, (fy.get(e.target) ?? 0) - uy * f);
        }

        // Integrate velocities and move nodes
        return nds.map((n) => {
          if (pinned.has(n.id) || frozen.has(n.id)) return n;
          const vel = vels.get(n.id)!;
          vel.vx = Math.max(
            -MAX_V,
            Math.min(MAX_V, (vel.vx + fx.get(n.id)!) * DAMP)
          );
          vel.vy = Math.max(
            -MAX_V,
            Math.min(MAX_V, (vel.vy + fy.get(n.id)!) * DAMP)
          );
          return {
            ...n,
            position: { x: n.position.x + vel.vx, y: n.position.y + vel.vy },
          };
        });
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [setNodes]); // setNodes is stable — loop runs for the component's lifetime

  // Call pin() on drag start so the simulation doesn't fight user's drag
  const pin = useCallback((id: string) => {
    pinnedRef.current.add(id);
  }, []);

  // Call unpin() on drag end; zero out velocity so it doesn't shoot off
  const unpin = useCallback((id: string) => {
    pinnedRef.current.delete(id);
    velRef.current.set(id, { vx: 0, vy: 0 });
  }, []);

  return { pin, unpin };
}
