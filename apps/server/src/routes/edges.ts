import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CreateEdgeSchema, UpdateEdgeSchema } from '@context-collab/shared';
import type { Edge } from '@prisma/client';

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
    res.status(201).json({ data: mapEdge(edge) });
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
    res.json({ data: mapEdge(edge) });
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
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete edge', statusCode: 500 });
  }
});
