import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase.service.js';
import { createLogger } from '../utils/logger.js';
import redis from '../config/redis-client.js';

const logger = createLogger('auth-middleware');

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
  }
}

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Auth Middleware — Full Supabase JWT Verification
 *
 * Validates the Bearer token against Supabase Auth (via service role key).
 * Rejects requests with missing, invalid, or expired tokens.
 * Checks if the user is banned (Auth metadata or banned_users.expires_at).
 * Attaches req.user = { id, email } on success.
 * ════════════════════════════════════════════════════════════════════════════════
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid Bearer token required',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid Bearer token required',
    });
    return;
  }

  try {
    const cacheKey = `auth:session:${token}`;
    // Attempt to get cached session, swallow redis errors to fallback to DB
    const cachedSessionStr = await redis.get(cacheKey).catch(() => null);

    let user: any = null;
    let isBanned = false;
    let bannedUntil = null;

    if (cachedSessionStr) {
      const cached = JSON.parse(cachedSessionStr);
      user = cached.user;
      isBanned = cached.isBanned;
      bannedUntil = cached.bannedUntil;
    } else {
      const { data: authData, error } = await supabase.auth.getUser(token);

      if (error || !authData?.user) {
        // Secure Audit Logging: Never log the full token!
        const tokenPreview = token?.substring(0, 15) + '...';
        logger.warn('Auth failed (Invalid token)', {
          ip: req.ip,
          userAgent: req.get('User-Agent')?.substring(0, 100),
          tokenPreview,
          reason: error?.message || 'invalid_token',
          timestamp: new Date().toISOString(),
        });

        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
        return;
      }

      user = authData.user;

      // Check both Auth metadata and banned_users rows.
      const isAuthBanned = user.banned_until && new Date(user.banned_until) > new Date();

      const { data: banRows } = await supabase
        .from('banned_users')
        .select('expires_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(10);

      const activeBan = (banRows ?? []).find((row) => {
        if (!row.expires_at) {
          return true;
        }
        return new Date(row.expires_at) > new Date();
      });

      isBanned = isAuthBanned || !!activeBan;
      bannedUntil = isAuthBanned ? user.banned_until : activeBan?.expires_at ?? null;

      // Cache validation result in Redis for 5 minutes
      await redis.set(
        cacheKey,
        JSON.stringify({ user, isBanned, bannedUntil }),
        'EX',
        300
      ).catch((err: unknown) => logger.error('Redis cache set error', { err }));
    }

    if (isBanned) {
      logger.warn('Banned user attempted access', { userId: user.id, bannedUntil });
      res.status(403).json({
        error: 'Forbidden',
        message: 'Account suspended',
      });
      return;
    }

    // Attach authenticated user to request
    req.user = {
      id: user.id,
      email: user.email!,
    };

    next();
  } catch (err) {
    logger.error('Auth middleware error', { err });
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication failed' });
  }
}
