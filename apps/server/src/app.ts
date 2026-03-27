import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { projectsRouter } from './routes/projects';
import { pagesRouter } from './routes/pages';
import { nodesRouter } from './routes/nodes';
import { edgesRouter } from './routes/edges';
import { settingsRouter } from './routes/settings';
import { requireAuth } from './middleware/requireAuth';

export function createApp() {
  const app = express();

  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes — no auth required for login
  app.use('/api/v1/auth', authRouter);

  // Protect all mutation methods on data routes (POST / PATCH / PUT / DELETE)
  // GET requests remain public so view-only users can browse.
  const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
  app.use('/api/v1/projects', (req, res, next) => {
    if (MUTATION_METHODS.has(req.method)) return requireAuth(req, res, next);
    next();
  });
  app.use('/api/v1/projects/:projectId/pages', (req, res, next) => {
    if (MUTATION_METHODS.has(req.method)) return requireAuth(req, res, next);
    next();
  });
  app.use('/api/v1/pages/:pageId/nodes', (req, res, next) => {
    if (MUTATION_METHODS.has(req.method)) return requireAuth(req, res, next);
    next();
  });
  app.use('/api/v1/pages/:pageId/edges', (req, res, next) => {
    if (MUTATION_METHODS.has(req.method)) return requireAuth(req, res, next);
    next();
  });

  // API routes
  app.use('/api/v1/settings', settingsRouter);
  app.use('/api/v1/projects', projectsRouter);
  app.use('/api/v1/projects/:projectId/pages', pagesRouter);
  app.use('/api/v1/pages/:pageId/nodes', nodesRouter);
  app.use('/api/v1/pages/:pageId/edges', edgesRouter);

  // 404 fallback
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found', message: 'Route not found', statusCode: 404 });
  });

  return app;
}
