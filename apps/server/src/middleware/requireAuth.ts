import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth';
import type { TokenPayload } from '../lib/auth';

// Extend Express Request to carry verified user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header', statusCode: 401 });
    return;
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token', statusCode: 401 });
    return;
  }

  req.user = payload;
  next();
}
