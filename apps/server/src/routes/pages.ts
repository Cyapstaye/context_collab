import { Router } from 'express';

// Mounted at /api/v1/projects/:projectId/pages
export const pagesRouter = Router({ mergeParams: true });

pagesRouter.get('/', (_req, res) => {
  res.json({ data: [] });
});

pagesRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 3', statusCode: 501 });
});

pagesRouter.get('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 3', statusCode: 501 });
});

pagesRouter.patch('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 3', statusCode: 501 });
});

pagesRouter.delete('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 3', statusCode: 501 });
});

// POST /api/v1/projects/:projectId/pages/:id/duplicate
pagesRouter.post('/:id/duplicate', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 3', statusCode: 501 });
});
