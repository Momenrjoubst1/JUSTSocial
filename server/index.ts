import "./config/env.js"; // Initialize environment variables first
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Config & Middleware
import { appConfig } from "./config/app.config.js";
import { globalLimiter } from "./middleware/rate-limiters.js";
import { logger } from "./utils/logger.js";

// Routes
import chatRoutes from "./routes/chat.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Server environment initializing...");
console.log("✅ OPENROUTER_API_KEY status:", !!process.env.OPENROUTER_API_KEY);

const app = express();
app.set("trust proxy", 1);

const PORT = Number(appConfig.port);

// ── Global Middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: appConfig.bodyLimit || "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: (origin, callback) => {
      // In development, allow no origin (e.g. Postman) or any origin if origins list is empty
      if (!origin || appConfig.nodeEnv === "development") {
        return callback(null, true);
      }
      if (appConfig.frontendOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(globalLimiter);

// ── Public Routes ──────────────────────────────────────────────────────────
app.use("/api/chat", chatRoutes);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Global Error Handler ───────────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const error = err instanceof Error ? err : new Error("Unknown error");

  logger.error("Unhandled error", {
    message: error.message,
    stack: error.stack,
  });

  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

if (appConfig.nodeEnv !== "test") {
  console.log(`🚀 Final Port Config: ${PORT}`);

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`⚠️ Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

export default app;
