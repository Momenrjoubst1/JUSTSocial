import './loadEnv.js';
import { appConfig } from './config/index.js';
import express from 'express';
import cors from 'cors';
import { globalLimiter } from './middleware/rate-limiters.js';
import livekitRoutes from './routes/livekit.routes.js';
import livekitWebhookRouter from './routes/livekit-webhook.routes.js';
import agentRoutes from './routes/agent.routes.js';
import moderationRoutes from './routes/moderation.routes.js';
import iceRoutes from './routes/ice.routes.js';
import chatRoutes from './routes/chat.routes.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = appConfig.port;

// ── Global Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin/server-to-server requests with no Origin header.
    if (!origin) return callback(null, true);
    if (appConfig.frontendOrigins.includes(origin)) return callback(null, true);

    logger.warn('Blocked by CORS policy', { origin });
    return callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json({ limit: appConfig.bodyLimit }));
app.use(globalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────
// Webhook must be first — LiveKit calls it server-to-server with no user JWT
app.use('/api', livekitWebhookRouter);

import { authMiddleware } from './middleware/auth.middleware.js';

app.use('/api', authMiddleware, livekitRoutes);
app.use('/api', authMiddleware, agentRoutes);
app.use('/api/moderation', authMiddleware, moderationRoutes);
app.use('/api', authMiddleware, iceRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);

app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ──────────────────────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

if (appConfig.nodeEnv !== 'test') {
  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(`✅ Server running on http://localhost:${PORT}`);
  });

  // ── Graceful Shutdown ─────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info(`⚠️ Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info('✅ HTTP server closed.');
      process.exit(0);
    });
    // Force close after 10s
    setTimeout(() => {
      logger.error('❌ Could not close connections in time, forcing shutdown.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
