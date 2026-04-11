import { Request, Response, NextFunction } from 'express';

export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const adminKey = req.headers['x-admin-key'];

  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    res.status(403).json({ success: false, error: 'Unauthorized' });
    return;
  }

  next();
}
