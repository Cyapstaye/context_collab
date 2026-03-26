import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CreateNodeSchema, UpdateNodeSchema, NodePositionsSchema } from '@context-collab/shared';
import type { Node } from '@prisma/client';

// Mounted at /api/v1/pages/:pageId/nodes
export const nodesRouter = Router({ mergeParams: true });

const DEFAULT_POSITIONS = { element: null, proposition: null, layer: null, axis3d: null };

function parsePositions(json: string) {
  try {
    return NodePositionsSchema.parse(JSON.parse(json));
  } catch {
    return DEFAULT_POSITIONS;
  }
}

function parseJson<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

function mapNode(n: Node) {
  return {
    id: n.id,
    pageId: n.pageId,
    type: n.type,
    name: n.name,
    labels: parseJson<string[]>(n.labelsJson, []),
    size: n.size,
    positions: parsePositions(n.positionsJson),
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

// GET /api/v1/pages/:pageId/nodes
nodesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const nodes = await prisma.node.findMany({
      where: { pageId: req.params.pageId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: nodes.map(mapNode) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list nodes', statusCode: 500 });
  }
});

// POST /api/v1/pages/:pageId/nodes
nodesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateNodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad Request', message: parsed.error.message, statusCode: 400 });
    return;
  }
  try {
    const node = await prisma.node.create({
      data: {
        pageId: req.params.pageId,
        type: parsed.data.type,
        name: parsed.data.name,
        labelsJson: JSON.stringify(parsed.data.labels),
        size: parsed.data.size,
        positionsJson: JSON.stringify(parsed.data.positions),
      },
    });
    res.status(201).json({ data: mapNode(node) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create node', statusCode: 500 });
  }
});

// PATCH /api/v1/pages/:pageId/nodes/:id
nodesRouter.patch('/:id', async (req: Request, res: Response) => {
  const { pageId, id } = req.params;
  const parsed = UpdateNodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad Request', message: parsed.error.message, statusCode: 400 });
    return;
  }
  try {
    const existing = await prisma.node.findFirst({ where: { id, pageId } });
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: 'Node not found', statusCode: 404 });
      return;
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.labels !== undefined) data.labelsJson = JSON.stringify(parsed.data.labels);
    if (parsed.data.size !== undefined) data.size = parsed.data.size;
    if (parsed.data.positions !== undefined) {
      // Merge incoming (partial) positions with existing
      const existingPos = parsePositions(existing.positionsJson);
      const incoming = parsed.data.positions as Record<string, unknown>;
      const merged = {
        element: incoming.element !== undefined ? incoming.element : existingPos.element,
        proposition: incoming.proposition !== undefined ? incoming.proposition : existingPos.proposition,
        layer: incoming.layer !== undefined ? incoming.layer : existingPos.layer,
        axis3d: incoming.axis3d !== undefined ? incoming.axis3d : existingPos.axis3d,
      };
      data.positionsJson = JSON.stringify(merged);
    }

    const node = await prisma.node.update({ where: { id }, data });
    res.json({ data: mapNode(node) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update node', statusCode: 500 });
  }
});

// DELETE /api/v1/pages/:pageId/nodes/:id
nodesRouter.delete('/:id', async (req: Request, res: Response) => {
  const { pageId, id } = req.params;
  try {
    const existing = await prisma.node.findFirst({ where: { id, pageId } });
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: 'Node not found', statusCode: 404 });
      return;
    }
    await prisma.node.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete node', statusCode: 500 });
  }
});
