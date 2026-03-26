import express from 'express';
import cors from 'cors';
import { projectsRouter } from './routes/projects';
import { pagesRouter } from './routes/pages';
import { nodesRouter } from './routes/nodes';
import { edgesRouter } from './routes/edges';

export function createApp() {
  const app = express();

  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
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
