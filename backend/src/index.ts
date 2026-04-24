import "./config/env.js";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";

import { appConfig } from "./config/app.config.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { globalLimiter } from "./middleware/rate-limiters.js";
import { logger } from "./utils/logger.js";

import agentRoutes from "./routes/agent.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import followRoutes from "./routes/follow.routes.js";
import iceRoutes from "./routes/ice.routes.js";
import keysRoutes from "./routes/keys.routes.js";
import livekitRoutes from "./routes/livekit.routes.js";
import livekitWebhookRoutes from "./routes/livekit-webhook.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import moderationRoutes from "./routes/moderation.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import profileRoutes from "./routes/profile.routes.js";

const app = express();
app.set("trust proxy", 1);

const PORT = Number(appConfig.port);

console.log("Server environment initializing...");
console.log("OPENROUTER_API_KEY status:", !!process.env.OPENROUTER_API_KEY);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || appConfig.nodeEnv === "development") {
        callback(null, true);
        return;
      }

      if (appConfig.frontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use("/api", livekitWebhookRoutes);

app.use(express.json({ limit: appConfig.bodyLimit || "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

app.use("/api/chat", authMiddleware, chatRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/moderation", moderationRoutes);

app.use("/api", authMiddleware, iceRoutes);
app.use("/api", authMiddleware, livekitRoutes);
app.use("/api", authMiddleware, agentRoutes);
app.use("/api/follow", authMiddleware, followRoutes);
app.use("/api/keys", authMiddleware, keysRoutes);
app.use("/api/messages", authMiddleware, messagesRoutes);
app.use("/api/notifications", authMiddleware, notificationsRoutes);
app.use("/api/profile", authMiddleware, profileRoutes);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err instanceof Error ? err : new Error("Unknown error");

    logger.error("Unhandled error", {
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  },
);

if (appConfig.nodeEnv !== "test") {
  console.log(`Final Port Config: ${PORT}`);

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

export default app;
