import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  CreatePageSchema,
  UpdatePageSchema,
  PageExportSchema,
  NodePositionsSchema,
} from '@context-collab/shared';
import type { Page, Node, Edge } from '@prisma/client';

// Mounted at /api/v1/projects/:projectId/pages
export const pagesRouter = Router({ mergeParams: true });

const DEFAULT_POSITIONS = { element: null, proposition: null, layer: null, axis3d: null };

function parseJson<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

function parsePositions(json: string) {
  try { return NodePositionsSchema.parse(JSON.parse(json)); } catch { return DEFAULT_POSITIONS; }
}

function mapPage(p: Page) {
  return {
    id: p.id,
    projectId: p.projectId,
    name: p.name,
    labels: parseJson<string[]>(p.labelsJson, []),
    relations: parseJson<string[]>(p.relationsJson, []),
    order: p.order,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function mapNode(n: Node) {
  return {
    id: n.id,
    pageId: n.pageId,
    type: n.type as 'element' | 'proposition',
    name: n.name,
    labels: parseJson<string[]>(n.labelsJson, []),
    size: n.size,
    positions: parsePositions(n.positionsJson),
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

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

async function getNextOrder(projectId: string): Promise<number> {
  const result = await prisma.page.aggregate({
    where: { projectId },
    _max: { order: true },
  });
  return (result._max.order ?? -1) + 1;
}

// ─── Routes (import must come before /:id to avoid conflict) ────────────────

// POST /import — Import page from exported JSON (creates new page)
pagesRouter.post('/import', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const parsed = PageExportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid export format', statusCode: 400 });
    return;
  }

  const { page: src, nodes: srcNodes, edges: srcEdges } = parsed.data;

  try {
    const order = await getNextOrder(projectId);
    const newPage = await prisma.page.create({
      data: {
        projectId,
        name: src.name + ' (가져오기)',
        labelsJson: JSON.stringify(src.labels),
        relationsJson: JSON.stringify(src.relations),
        order,
      },
    });

    // Create nodes and build old-id → new-id map
    const idMap = new Map<string, string>();
    for (const node of srcNodes) {
      const created = await prisma.node.create({
        data: {
          pageId: newPage.id,
          type: node.type,
          name: node.name,
          labelsJson: JSON.stringify(node.labels),
          size: node.size,
          positionsJson: JSON.stringify(node.positions),
        },
      });
      idMap.set(node.id, created.id);
    }

    // Create edges with remapped node IDs
    for (const edge of srcEdges) {
      const newSource = idMap.get(edge.source);
      const newTarget = idMap.get(edge.target);
      if (!newSource || !newTarget) continue;
      await prisma.edge.create({
        data: {
          pageId: newPage.id,
          source: newSource,
          target: newTarget,
          weight: edge.weight,
          relation: edge.relation,
        },
      });
    }

    res.status(201).json({ data: mapPage(newPage) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to import page', statusCode: 500 });
  }
});

// GET / — List pages for project
pagesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const pages = await prisma.page.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { order: 'asc' },
    });
    res.json({ data: pages.map(mapPage) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list pages', statusCode: 500 });
  }
});

// POST / — Create page
pagesRouter.post('/', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const parsed = CreatePageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad Request', message: parsed.error.message, statusCode: 400 });
    return;
  }
  try {
    const order = await getNextOrder(projectId);
    const page = await prisma.page.create({
      data: { projectId, name: parsed.data.name, order },
    });
    res.status(201).json({ data: mapPage(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create page', statusCode: 500 });
  }
});

// GET /:id/export — Export page as JSON
pagesRouter.get('/:id/export', async (req: Request, res: Response) => {
  const { projectId, id } = req.params;
  try {
    const page = await prisma.page.findFirst({ where: { id, projectId } });
    if (!page) {
      res.status(404).json({ error: 'Not Found', message: 'Page not found', statusCode: 404 });
      return;
    }
    const [nodes, edges] = await Promise.all([
      prisma.node.findMany({ where: { pageId: id }, orderBy: { createdAt: 'asc' } }),
      prisma.edge.findMany({ where: { pageId: id }, orderBy: { createdAt: 'asc' } }),
    ]);
    res.json({
      data: {
        version: 1,
        page: mapPage(page),
        nodes: nodes.map(mapNode),
        edges: edges.map(mapEdge),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to export page', statusCode: 500 });
  }
});

// GET /:id — Get single page
pagesRouter.get('/:id', async (req: Request, res: Response) => {
  const { projectId, id } = req.params;
  try {
    const page = await prisma.page.findFirst({ where: { id, projectId } });
    if (!page) {
      res.status(404).json({ error: 'Not Found', message: 'Page not found', statusCode: 404 });
      return;
    }
    res.json({ data: mapPage(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get page', statusCode: 500 });
  }
});

// PATCH /:id — Update page
pagesRouter.patch('/:id', async (req: Request, res: Response) => {
  const { projectId, id } = req.params;
  const parsed = UpdatePageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad Request', message: parsed.error.message, statusCode: 400 });
    return;
  }
  try {
    const existing = await prisma.page.findFirst({ where: { id, projectId } });
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: 'Page not found', statusCode: 404 });
      return;
    }
    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.labels !== undefined) data.labelsJson = JSON.stringify(parsed.data.labels);
    if (parsed.data.relations !== undefined) data.relationsJson = JSON.stringify(parsed.data.relations);

    const page = await prisma.page.update({ where: { id }, data });
    res.json({ data: mapPage(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update page', statusCode: 500 });
  }
});

// DELETE /:id — Delete page
pagesRouter.delete('/:id', async (req: Request, res: Response) => {
  const { projectId, id } = req.params;
  try {
    const existing = await prisma.page.findFirst({ where: { id, projectId } });
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: 'Page not found', statusCode: 404 });
      return;
    }
    await prisma.page.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete page', statusCode: 500 });
  }
});

// POST /:id/duplicate — Duplicate page with all nodes and edges
pagesRouter.post('/:id/duplicate', async (req: Request, res: Response) => {
  const { projectId, id } = req.params;
  try {
    const original = await prisma.page.findFirst({ where: { id, projectId } });
    if (!original) {
      res.status(404).json({ error: 'Not Found', message: 'Page not found', statusCode: 404 });
      return;
    }
    const [nodes, edges] = await Promise.all([
      prisma.node.findMany({ where: { pageId: id }, orderBy: { createdAt: 'asc' } }),
      prisma.edge.findMany({ where: { pageId: id }, orderBy: { createdAt: 'asc' } }),
    ]);

    const order = await getNextOrder(projectId);
    const newPage = await prisma.page.create({
      data: {
        projectId,
        name: original.name + ' (복사)',
        labelsJson: original.labelsJson,
        relationsJson: original.relationsJson,
        order,
      },
    });

    const idMap = new Map<string, string>();
    for (const node of nodes) {
      const created = await prisma.node.create({
        data: {
          pageId: newPage.id,
          type: node.type,
          name: node.name,
          labelsJson: node.labelsJson,
          size: node.size,
          positionsJson: node.positionsJson,
        },
      });
      idMap.set(node.id, created.id);
    }

    for (const edge of edges) {
      const newSource = idMap.get(edge.source);
      const newTarget = idMap.get(edge.target);
      if (!newSource || !newTarget) continue;
      await prisma.edge.create({
        data: {
          pageId: newPage.id,
          source: newSource,
          target: newTarget,
          weight: edge.weight,
          relation: edge.relation,
        },
      });
    }

    res.status(201).json({ data: mapPage(newPage) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to duplicate page', statusCode: 500 });
  }
});
