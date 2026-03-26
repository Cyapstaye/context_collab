import { Router } from 'express';

// Mounted at /api/v1/pages/:pageId/edges
export const edgesRouter = Router({ mergeParams: true });

edgesRouter.get('/', (_req, res) => {
  res.json({ data: [] });
});

edgesRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 2', statusCode: 501 });
});

edgesRouter.patch('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 2', statusCode: 501 });
});

edgesRouter.delete('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 2', statusCode: 501 });
});
