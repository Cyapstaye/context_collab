import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { comparePassword, signToken } from '../lib/auth';
import { requireAuth } from '../middleware/requireAuth';
import { LoginSchema } from '@context-collab/shared';

export const authRouter = Router();

// POST /api/v1/auth/login
authRouter.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bad Request', message: 'email and password are required', statusCode: 400 });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Constant-time response — don't reveal whether email exists
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 });
    return;
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 });
    return;
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  res.json({
    data: {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    },
  });
});

// GET /api/v1/auth/me
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(401).json({ error: 'Unauthorized', message: 'User not found', statusCode: 401 });
    return;
  }
  res.json({ data: { id: user.id, email: user.email, role: user.role } });
});
