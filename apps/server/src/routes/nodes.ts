import { Router } from 'express';

// Mounted at /api/v1/pages/:pageId/nodes
export const nodesRouter = Router({ mergeParams: true });

nodesRouter.get('/', (_req, res) => {
  res.json({ data: [] });
});

nodesRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 2', statusCode: 501 });
});

nodesRouter.patch('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 2', statusCode: 501 });
});

nodesRouter.delete('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 2', statusCode: 501 });
});
