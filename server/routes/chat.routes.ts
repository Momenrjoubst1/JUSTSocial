import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

const DEFAULT_MODEL =
  process.env.ASSISTANT_DEFAULT_MODEL?.trim() ||
  "anthropic/claude-3.5-haiku";

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { messages, system, tools, model } = req.body ?? {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages[] is required" });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res
        .status(500)
        .json({ error: "Missing OPENROUTER_API_KEY" });
    }

    // ⚠️ Headers required for streaming SSE
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // res.flushHeaders(); // Not always available, but good to have if it is

    const controller = new AbortController();
    req.on("close", () => controller.abort());

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
            "X-Title": process.env.OPENROUTER_APP_NAME || "Assistant UI",
          },
          body: JSON.stringify({
            model: typeof model === "string" ? model : DEFAULT_MODEL,
            stream: true,
            messages,
          }),
        }
      );

      if (!response.ok || !response.body) {
        const text = await response.text();
        res.write(
          `event: error\ndata: ${JSON.stringify({
            error: text,
          })}\n\n`
        );
        return res.end();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // OpenRouter sends ready-to-use SSE chunks
        res.write(chunk);
      }
    } catch (error) {
      console.error("OpenRouter Stream Error:", error);
      if (!res.writableEnded) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Internal Stream Error" })}\n\n`);
      }
    } finally {
      res.end();
    }
  })
);

export default router;
