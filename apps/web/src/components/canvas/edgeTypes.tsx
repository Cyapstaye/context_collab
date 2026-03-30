import { memo } from "react";
import { getStraightPath, BaseEdge } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import { parseRelation } from "../../lib/connectionTypes";
import type { ConnType, ConnDir } from "../../lib/connectionTypes";
import { useDesignStore } from "../../store/designStore";

// ── Glyph config per connection type ─────────────────────────────────────────
//
//  ›  U+203A  single right-pointing angle quote  → clean, slim chevron
//  ‹  U+2039  single left-pointing angle quote
//  »  U+00BB  double right-pointing angle quote  → bolder, two-chevron glyph
//  «  U+00AB  double left-pointing angle quote
//
//  positive   ›  ›  ›  ›  ›    — solid chevron, prominent size
//  negative   /  /  /  /  /    — diagonal slash; backward uses \
//  resonate   ◆  ◆  ◆  ◆  ◆   — filled diamonds
//  offset     ◇  ◇  ◇  ◇  ◇   — empty diamonds

interface GlyphConfig {
  fwd: string;
  bwd: string;
  /** Multiplier applied to the base edgeFontSize from design settings */
  scale: number;
  /** Estimated px width per glyph at the base font size of 11 */
  approxCharW: number;
}

const GLYPH: Record<ConnType, GlyphConfig> = {
  positive: { fwd: "›", bwd: "‹", scale: 1.18, approxCharW: 7 },
  negative: { fwd: "/", bwd: "\\", scale: 0.5, approxCharW: 5 },
  resonate: { fwd: "◆", bwd: "◆", scale: 0.91, approxCharW: 10 },
  offset:   { fwd: "◇", bwd: "◇", scale: 0.91, approxCharW: 10 },
  "":       { fwd: "›", bwd: "‹", scale: 0.91, approxCharW: 5.5 },
};

function buildGlyphs(
  type: ConnType,
  dir: ConnDir,
  dist: number,
  baseFontSize: number
): { text: string; fontSize: number } {
  const cfg = GLYPH[type] ?? GLYPH[""];
  const fontSize = baseFontSize * cfg.scale;
  const charW = cfg.approxCharW * (fontSize / 11);
  const count = Math.max(2, Math.round(dist / charW));
  const uniform = type === "resonate" || type === "offset";
  let text = "";
  for (let i = 0; i < count; i++) {
    if (uniform) {
      text += cfg.fwd;
    } else if (dir === "both") {
      text += i % 2 === 0 ? cfg.fwd : cfg.bwd;
    } else {
      text += dir === "backward" ? cfg.bwd : cfg.fwd;
    }
  }
  return { text, fontSize };
}

// ── ConnEdge ──────────────────────────────────────────────────────────────────

export const ConnEdge = memo(function ConnEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  selected,
  data,
}: EdgeProps) {
  const edgeFontSize  = useDesignStore((s) => s.settings.edgeFontSize ?? 11);
  const edgeOpacity   = useDesignStore((s) => s.settings.edgeOpacity  ?? 1);

  const relation = (data as { relation?: string }).relation ?? "";
  const weight   = (data as { weight?: number }).weight ?? 0.5;
  const { type, dir } = parseRelation(relation);
  const opacity  = (weight / 1.2) * edgeOpacity;
  const color    = selected ? "#3b82f6" : "#374151";
  const dist     = Math.hypot(targetX - sourceX, targetY - sourceY);
  const angleDeg = Math.atan2(targetY - sourceY, targetX - sourceX) * (180 / Math.PI);

  // Self-loop guard — source === target should never exist, but render nothing if it does
  if (source === target) return null;

  // Invisible wide line for hit area
  const hitArea = (
    <line
      x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}
      stroke="transparent" strokeWidth={12}
      style={{ cursor: "pointer" }}
    />
  );

  // No type → plain thin line
  if (!type) {
    const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    return (
      <g style={{ userSelect: "none", cursor: "pointer" } as React.CSSProperties}>
        {hitArea}
        <BaseEdge
          id={id} path={path}
          style={{ ...(style ?? {}), stroke: color, strokeWidth: 1, opacity }}
        />
      </g>
    );
  }

  if (dist < 8) return <>{hitArea}</>;

  const { text, fontSize } = buildGlyphs(type, dir, dist, edgeFontSize);

  return (
    <g style={{ userSelect: "none", cursor: "pointer" } as React.CSSProperties}>
      {hitArea}
      <text
        x={sourceX}
        y={sourceY}
        fontSize={fontSize}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={color}
        opacity={opacity}
        dominantBaseline="central"
        textLength={dist}
        lengthAdjust="spacingAndGlyphs"
        transform={`rotate(${angleDeg}, ${sourceX}, ${sourceY})`}
        style={{ userSelect: "none", pointerEvents: "none", cursor: "pointer" } as React.CSSProperties}
      >
        {text}
      </text>
    </g>
  );
});

export const connEdgeTypes = { conn: ConnEdge };
