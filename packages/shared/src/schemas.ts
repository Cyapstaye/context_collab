import { z } from 'zod';

// ─── Primitives ───────────────────────────────────────────────────────────────

export const NodeTypeSchema = z.enum(['element', 'proposition']);

export const ViewNameSchema = z.enum(['element', 'proposition', 'layer', 'axis3d']);

// NodePositionsSchema is used server-side to parse/validate the positionsJson
// string column on Node before returning typed data to clients.
export const NodePositionsSchema = z.object({
  element: z.object({ x: z.number(), y: z.number() }).nullable(),
  proposition: z.object({ x: z.number(), y: z.number() }).nullable(),
  layer: z.object({ x: z.number(), y: z.number() }).nullable(),
  axis3d: z.object({ x: z.number(), y: z.number() }).nullable(),
});

// ─── Node ─────────────────────────────────────────────────────────────────────

export const NodeSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  type: NodeTypeSchema,
  name: z.string().min(1),
  labels: z.array(z.string()),
  size: z.number().min(0.1).max(10).default(1.0),
  positions: NodePositionsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateNodeSchema = z.object({
  type: NodeTypeSchema,
  name: z.string().min(1),
  labels: z.array(z.string()).optional().default([]),
  size: z.number().min(0.1).max(10).optional().default(1.0),
  positions: NodePositionsSchema.optional().default({
    element: null,
    proposition: null,
    layer: null,
    axis3d: null,
  }),
});

export const UpdateNodeSchema = z.object({
  name: z.string().min(1).optional(),
  labels: z.array(z.string()).optional(),
  size: z.number().min(0.1).max(10).optional(),
  positions: NodePositionsSchema.partial().optional(),
});

// ─── Edge ─────────────────────────────────────────────────────────────────────

export const EdgeSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  source: z.string(),
  target: z.string(),
  weight: z.number().min(0).max(1).default(0.5),
  relation: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  weight: z.number().min(0).max(1).optional().default(0.5),
  relation: z.string().optional().default(''),
});

export const UpdateEdgeSchema = z.object({
  weight: z.number().min(0).max(1).optional(),
  relation: z.string().optional(),
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export const PageSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1),
  labels: z.array(z.string()),
  relations: z.array(z.string()), // page-level relation pool (used on edges)
  order: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreatePageSchema = z.object({
  name: z.string().min(1),
});

export const UpdatePageSchema = z.object({
  name: z.string().min(1).optional(),
  labels: z.array(z.string()).optional(),
  relations: z.array(z.string()).optional(),
});

// ─── Project ──────────────────────────────────────────────────────────────────

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// ─── Export/Import ────────────────────────────────────────────────────────────

export const PageExportSchema = z.object({
  version: z.literal(1),
  page: PageSchema,
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});
