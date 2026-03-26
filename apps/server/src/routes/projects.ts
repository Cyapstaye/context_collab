import { Router } from 'express';

export const projectsRouter = Router();

// GET /api/v1/projects
projectsRouter.get('/', (_req, res) => {
  res.json({ data: [] });
});

// POST /api/v1/projects
projectsRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 3', statusCode: 501 });
});

// GET /api/v1/projects/:id
projectsRouter.get('/:id', (req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 3', statusCode: 501 });
});

// PATCH /api/v1/projects/:id
projectsRouter.patch('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 3', statusCode: 501 });
});

// DELETE /api/v1/projects/:id
projectsRouter.delete('/:id', (_req, res) => {
  res.status(501).json({ error: 'Not Implemented', message: 'Phase 3', statusCode: 501 });
});
