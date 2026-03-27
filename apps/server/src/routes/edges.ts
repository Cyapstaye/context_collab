import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CreateEdgeSchema, UpdateEdgeSchema, SOCKET_EVENTS } from '@context-collab/shared';
import type { Edge } from '@prisma/client';
import { emitToPage } from '../socketManager';

// Mounted at /api/v1/pages/:pageId/edges
export const edgesRouter = Router({ mergeParams: true });

function mapEdge(e: Edge) {
  return {
    id: e.id,
    pageId: e.pageId,
    source: e.source,
    target: e.target,
    weight: e.weight,
    relation: e.relation,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

// GET /api/v1/pages/:pageId/edges
edgesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const edges = await prisma.edge.findMany({
      where: { pageId: req.params.pageId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: edges.map(mapEdge) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list edges', statusCode: 500 });
  }
});

// POST /api/v1/pages/:pageId/edges
edgesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateEdgeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad Request', message: parsed.error.message, statusCode: 400 });
    return;
  }
  try {
    // Validate that source and target nodes both belong to this page
    const [sourceNode, targetNode] = await Promise.all([
      prisma.node.findFirst({ where: { id: parsed.data.source, pageId: req.params.pageId } }),
      prisma.node.findFirst({ where: { id: parsed.data.target, pageId: req.params.pageId } }),
    ]);
    if (!sourceNode || !targetNode) {
      res.status(400).json({ error: 'Bad Request', message: 'Source or target node does not belong to this page', statusCode: 400 });
      return;
    }

    // Prevent duplicate edges (bidirectional check)
    const existing = await prisma.edge.findFirst({
      where: {
        pageId: req.params.pageId,
        OR: [
          { source: parsed.data.source, target: parsed.data.target },
          { source: parsed.data.target, target: parsed.data.source },
        ],
      },
    });
    if (existing) {
      res.status(409).json({ error: 'Conflict', message: 'Edge already exists', statusCode: 409 });
      return;
    }

    const edge = await prisma.edge.create({
      data: {
        pageId: req.params.pageId,
        source: parsed.data.source,
        target: parsed.data.target,
        weight: parsed.data.weight,
        relation: parsed.data.relation,
      },
    });
    const mapped = mapEdge(edge);
    emitToPage(req.params.pageId, SOCKET_EVENTS.EDGE_CREATED, { edge: mapped });
    res.status(201).json({ data: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create edge', statusCode: 500 });
  }
});

// PATCH /api/v1/pages/:pageId/edges/:id
edgesRouter.patch('/:id', async (req: Request, res: Response) => {
  const { pageId, id } = req.params;
  const parsed = UpdateEdgeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad Request', message: parsed.error.message, statusCode: 400 });
    return;
  }
  try {
    const existing = await prisma.edge.findFirst({ where: { id, pageId } });
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: 'Edge not found', statusCode: 404 });
      return;
    }
    const edge = await prisma.edge.update({ where: { id }, data: parsed.data });
    const mapped = mapEdge(edge);
    emitToPage(pageId, SOCKET_EVENTS.EDGE_UPDATED, { edge: mapped });
    res.json({ data: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update edge', statusCode: 500 });
  }
});

// DELETE /api/v1/pages/:pageId/edges/:id
edgesRouter.delete('/:id', async (req: Request, res: Response) => {
  const { pageId, id } = req.params;
  try {
    const existing = await prisma.edge.findFirst({ where: { id, pageId } });
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: 'Edge not found', statusCode: 404 });
      return;
    }
    await prisma.edge.delete({ where: { id } });
    emitToPage(pageId, SOCKET_EVENTS.EDGE_DELETED, { edgeId: id });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete edge', statusCode: 500 });
  }
});
