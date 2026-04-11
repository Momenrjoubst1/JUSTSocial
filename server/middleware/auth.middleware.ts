import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth-middleware');

// Extends Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * Auth Middleware — Full Supabase JWT Verification
 *
 * Validates the Bearer token against Supabase Auth (via service role key).
 * Rejects requests with missing, invalid, or expired tokens.
 * Checks if the user is banned (banned_until).
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
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Secure Audit Logging: Never log the full token!
      const tokenPreview = token?.substring(0, 15) + '...';
      logger.warn('Auth failed (Invalid token)', {
        ip: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 100),
        tokenPreview,
        reason: error?.message || 'invalid_token',
        timestamp: new Date().toISOString()
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    // Check if user is banned (Check both Auth metadata and Database active bans)
    const isAuthBanned = user.banned_until && new Date(user.banned_until) > new Date();
    
    const { data: banRecord } = await supabase
      .from('banned_users')
      .select('banned_until')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('banned_until', new Date().toISOString())
      .maybeSingle();

    if (isAuthBanned || banRecord) {
      const until = isAuthBanned ? user.banned_until : banRecord?.banned_until;
      logger.warn('Banned user attempted access', { userId: user.id, bannedUntil: until });
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
    (req as any).userId = user.id;

    next();
  } catch (err) {
    logger.error('Auth middleware error', { err });
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication failed' });
  }
}
