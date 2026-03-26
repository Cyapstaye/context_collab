import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CreateProjectSchema, UpdateProjectSchema } from '@context-collab/shared';
import type { Project } from '@prisma/client';

export const projectsRouter = Router();

function mapProject(p: Project) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// GET /api/v1/projects
projectsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ data: projects.map(mapProject) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list projects', statusCode: 500 });
  }
});

// POST /api/v1/projects
projectsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad Request', message: parsed.error.message, statusCode: 400 });
    return;
  }
  try {
    const project = await prisma.project.create({
      data: { name: parsed.data.name, description: parsed.data.description ?? '' },
    });
    res.status(201).json({ data: mapProject(project) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create project', statusCode: 500 });
  }
});

// GET /api/v1/projects/:id
projectsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      res.status(404).json({ error: 'Not Found', message: 'Project not found', statusCode: 404 });
      return;
    }
    res.json({ data: mapProject(project) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get project', statusCode: 500 });
  }
});

// PATCH /api/v1/projects/:id
projectsRouter.patch('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad Request', message: parsed.error.message, statusCode: 400 });
    return;
  }
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json({ data: mapProject(project) });
  } catch {
    res.status(404).json({ error: 'Not Found', message: 'Project not found', statusCode: 404 });
  }
});

// DELETE /api/v1/projects/:id
projectsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Not Found', message: 'Project not found', statusCode: 404 });
  }
});
