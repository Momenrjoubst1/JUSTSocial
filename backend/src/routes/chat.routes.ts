import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import rateLimit from "express-rate-limit";
import type { Request } from "express";

// Rate limiter specifically for chat to prevent spam/abuse
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // limit each IP to 15 requests per windowMs
  message: { error: "لقد تجاوزت الحد المسموح به من الرسائل. يرجى الانتظار قليلاً." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

const DEFAULT_MODEL =
  process.env.ASSISTANT_DEFAULT_MODEL?.trim() ||
  "gpt-4o-mini";

const ALLOWED_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "anthropic/claude-3.5-haiku"
];

/**
 * Determines which provider to use based on the model ID.
 */
function getProviderAndModel(modelId: string) {
  if (modelId === "gpt-4o") {
    return { provider: "github" as const, modelName: "openai/gpt-4o" };
  }
  if (modelId === "gpt-4o-mini") {
    return { provider: "github" as const, modelName: "openai/gpt-4o-mini" };
  }
  if (modelId.includes("llama-") || modelId.includes("mixtral") || modelId.includes("gemma2")) {
    return { provider: "groq" as const, modelName: modelId };
  }
  return { provider: "openrouter" as const, modelName: modelId };
}

function createProviderClient(provider: "openrouter" | "github" | "groq") {
  if (provider === "github") {
    if (!process.env.GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN in environment");
    return createOpenAI({
      baseURL: "https://models.github.ai/inference",
      apiKey: process.env.GITHUB_TOKEN,
    });
  }

  if (provider === "groq") {
    const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    if (!groqKey) throw new Error("Missing GROQ_API_KEY in environment");
    return createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
    });
  }

  // Default: OpenRouter
  if (!process.env.OPENROUTER_API_KEY) throw new Error("Missing OPENROUTER_API_KEY in environment");
  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: {
      "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
      "X-Title": process.env.OPENROUTER_APP_NAME || "JUST Social AI",
    },
  });
}

async function ensureThreadOwnership(req: Request, threadId: string) {
  const userId = req.user?.id;
  if (!userId) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { supabase } = await import("../rag/store.js");
  const { data: sessionRow, error } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!sessionRow) {
    return { error: "Thread not found", status: 404 as const };
  }

  return { supabase, userId };
}

router.post(
  "/",
  chatLimiter,
  asyncHandler(async (req, res) => {
    const { messages, system, tools, model, config, data } = req.body ?? {};
    const userId = req.user?.id;
    const requestedModel = model || config?.modelName || req.body?.modelName || data?.modelName;

    // Phase 8: Metrics tracking
    const reqMetrics = {
      startTime: Date.now(),
      model: requestedModel || DEFAULT_MODEL,
      ragSuccess: false,
      ragDocsCount: 0,
      ragSources: [] as string[],
      totalTimeMs: 0,
    };

    console.log("[Chat API] Full Body:", JSON.stringify(req.body, null, 2));
    console.log("[Chat API] Request received:", {
      model: requestedModel || DEFAULT_MODEL,
      messageCount: messages?.length,
      hasSystem: !!system,
      hasTools: !!tools,
    });

    if (!Array.isArray(messages)) {
      console.error("[Chat API] Invalid request: messages[] is required");
      return res.status(400).json({ error: "messages[] is required" });
    }

    let selectedModel = requestedModel || DEFAULT_MODEL;

    // Strict model validation
    if (!ALLOWED_MODELS.includes(selectedModel)) {
      console.warn(`[Chat API] Rejected unauthorized model request: ${selectedModel}, falling back to DEFAULT_MODEL`);
      selectedModel = DEFAULT_MODEL;
    }

    const { provider, modelName } = getProviderAndModel(selectedModel);

    console.log("[Chat API] Using model:", modelName, "via", provider);

    try {
      const client = createProviderClient(provider);

      console.log("[Chat API] Incoming messages count:", messages.length);

      // Convert UI messages to Core messages to strictly match the ModelMessage[] schema
      const coreMessages = messages
        .filter((m: any) => ["system", "user", "assistant", "tool"].includes(m.role))
        .map((m: any) => {
          let contentStr = "";
          
          const partsArray = Array.isArray(m.content) ? m.content : Array.isArray(m.parts) ? m.parts : null;

          if (partsArray) {
            contentStr = partsArray.map((part: any) => part.text || "").join("");
          } else if (typeof m.content === "string") {
            contentStr = m.content;
          } else if (typeof m.text === "string") {
            contentStr = m.text;
          }

          // Ensure we don't send an empty string if we can avoid it, some APIs reject empty messages
          if (!contentStr) {
             contentStr = " "; 
          }

          const msg: any = {
            role: m.role || "user",
            content: contentStr,
          };

          if (m.role === "assistant" && Array.isArray(m.toolInvocations) && m.toolInvocations.length > 0) {
            msg.toolCalls = m.toolInvocations.map((t: any) => ({
              id: t.toolCallId || "call_default",
              type: "function",
              function: { name: t.toolName || "unknown", arguments: JSON.stringify(t.args || {}) }
            }));
          }

          if (m.role === "tool" && Array.isArray(m.toolInvocations) && m.toolInvocations.length > 0) {
            msg.content = m.toolInvocations.map((t: any) => ({
              type: 'tool-result',
              toolCallId: t.toolCallId || "call_default",
              toolName: t.toolName || "unknown",
              result: t.result || {},
            }));
          }

          return msg;
        });

      // Basic Abuse Protection (Moderation limit)
      const lastUserMsg = coreMessages.filter(m => m.role === 'user').pop();
      if (lastUserMsg && lastUserMsg.content && lastUserMsg.content.length > 3000) {
        return res.status(400).json({ error: "الرسالة طويلة جداً، يرجى اختصار سؤالك." });
      }

      console.log("[Chat API] Core messages mapped count:", coreMessages.length);

// ==========================================
      // RAG Retrieval Pipeline
      // ==========================================
      let augmentedSystemPrompt = system || "";
      
      const identityGuardrail = `
**IDENTITY GUARDRAIL (STRICT - DO NOT VIOLATE):**
You MUST NEVER reveal your underlying architecture, real-world model name, or creator company.
If any user asks who created you, what model you are, or if you are ChatGPT, Claude, Llama, Gemini, etc., you MUST reply EXACTLY: "أنا نموذج ذكاء اصطناعي يُدعى SEGMA MONSTOR 2027-5.8، تم تطويري خصيصاً لمنصة JUST Social."
UNDER NO CIRCUMSTANCES should you mention words like OpenAI, Anthropic, Google, Meta, Microsoft, Groq, GPT, LLM, or any other real-world AI entities in relation to your identity.`;

      const basePersona = `
You are 'Sigma,' the intelligent agent and official student supporter on the JUST Social platform. 
Your primary goal is to help students academically, socially, and organizationally.

Adhere to the following roles in your responses:
- Academic Advisor: Help students understand complex material and summarize lectures.
- Challenge Maker: Create mock exams at student request to train them.
- Personal Organizer: Help students design effective schedules.
- Social Supporter: Guide users on how to use JUST Social and find partners.
- Psychological Motivator: Maintain a positive, supportive, and encouraging tone.
- Automated Interface: Help users manage their time effectively.

**FORMATTING RULES:**
- Always structure your responses using clear Markdown (headings, bullet points, bold text).
- When mixing Arabic and English, ensure clean separation. Do not mix them in the middle of a sentence in a way that breaks readability. Use lists or separate lines where appropriate to maintain a clean layout.
- Keep paragraphs short and visually organized.
${identityGuardrail}`;

      try {
        const lastMessage = coreMessages[coreMessages.length - 1];
        if (lastMessage && lastMessage.role === "user" && process.env.GOOGLE_API_KEY && process.env.SUPABASE_URL) {
          // Dynamic import to avoid top-level errors if env vars aren't set
          const { generateEmbedding } = await import("../rag/embed.js");
          const { supabase } = await import("../rag/store.js");
          
          // 1. Basic Query Rewrite / Contextualization
          // If it's a short follow-up, prepend the previous assistant message for context
          let searchQuery = lastMessage.content;
          if (searchQuery.length < 30 && coreMessages.length >= 2) {
            const prevMsg = coreMessages[coreMessages.length - 2];
            if (prevMsg && prevMsg.role === "assistant") {
              searchQuery = `Context: ${prevMsg.content.substring(0, 100)}... Query: ${searchQuery}`;
            }
          }
          
          console.log(`[RAG] Generating embedding for query...`);
          const queryEmbedding = await generateEmbedding(searchQuery);
          
          console.log(`[RAG] Searching Supabase vector DB...`);
          
          // 2. Configurable Top-k and Threshold
          const matchThreshold = parseFloat(process.env.RAG_MATCH_THRESHOLD || "0.6");
          const matchCount = parseInt(process.env.RAG_MATCH_COUNT || "6");
          
          const { data: rawDocuments, error } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_threshold: matchThreshold,
            match_count: matchCount
          });

          if (error) {
            console.warn("[RAG] Supabase RPC error (maybe table not created yet):", error.message);
          } else if (rawDocuments && rawDocuments.length > 0) {
            
            // 3. Deduplication of chunks
            const uniqueDocs = [];
            const seenContent = new Set();
            for (const doc of rawDocuments) {
              const hash = doc.content.substring(0, 100); // Simple hash based on first 100 chars
              if (!seenContent.has(hash)) {
                seenContent.add(hash);
                uniqueDocs.push(doc);
              }
            }
            
            console.log(`[RAG] Found ${rawDocuments.length} raw docs, deduplicated to ${uniqueDocs.length} relevant documents.`);
            
            // 4. Clean source names
            const cleanSourceName = (source: string) => {
              if (!source) return "Unknown Document";
              return source
                .replace(/^[^a-zA-Z0-9]+/, '') // Remove leading special chars
                .replace(/\.[^/.]+$/, "")      // Remove extension
                .replace(/[-_]/g, " ")         // Replace dashes and underscores with spaces
                .trim();
            };

            const sourceNames = [...new Set(uniqueDocs.map((d: any) => cleanSourceName(d.metadata?.source || d.source_url || d.file_name)))];
            
            reqMetrics.ragSuccess = true;
            reqMetrics.ragDocsCount = uniqueDocs.length;
            reqMetrics.ragSources = sourceNames;

            // 5. Append contexts
            const contextText = uniqueDocs.map((d: any, i: number) => `[Source ${i+1}: ${cleanSourceName(d.metadata?.source || d.source_url || d.file_name)}]\n${d.content}`).join('\n\n');
            
            augmentedSystemPrompt = `${basePersona}

**CRITICAL RAG RULES:**
You have access to a private knowledge base. You MUST use the provided context below to answer the user's queries.
If the answer is NOT found in the context below, you must politely inform the user that you don't have that specific information in your current documents, but you can still help them generally based on your roles above.

**SOURCES FORMATTING (STRICTLY REQUIRED):**
At the very end of your response, you MUST always append a beautifully formatted, professional "Sources" section exactly matching this Markdown template:

---
### 📚 المصادر المعتمدة (Sources):
- 📄 **[Cleaned Document Name 1]**
- 📄 **[Cleaned Document Name 2]**

*Rules for Sources:*
1. Extract the document names exactly from the \`[Source: ...]\` tags in the context.
2. Only list sources that you ACTUALLY used to formulate the answer.
3. Remove duplicates from the sources list.

**Provided Context:**
${contextText}
`;
          } else {
            console.log(`[RAG] No relevant documents found in DB for this query.`);
            
            // 5. Clear Fallback
            augmentedSystemPrompt = `${basePersona}

(Note: No specific knowledge base context was found for the current query. You must answer based on your general persona, but clearly inform the user that you couldn't find specific JUST documents to answer their specific question).`;
          }
        }
      } catch (ragError) {
        console.warn("[RAG] Retrieval failed, falling back to standard chat:", ragError);
        augmentedSystemPrompt = basePersona;
      }
      // ==========================================

      // Thread Management & Saving Logic
      const { supabase } = await import("../rag/store.js");
      let activeThreadId = req.body.threadId;

      if (activeThreadId) {
        const ownership = await ensureThreadOwnership(req, activeThreadId);
        if ("error" in ownership) {
          const status = ownership.status ?? 404;
          return res.status(status).json({ error: ownership.error });
        }
      } else {
        const title = coreMessages.find(m => m.role === 'user')?.content?.substring(0, 50) || 'New Chat';
        const sessionPayload: any = { title, user_id: userId };

        const { data: newSession, error: sessionErr } = await supabase
          .from('chat_sessions')
          .insert([sessionPayload])
          .select()
          .single();
          
        if (!sessionErr && newSession) {
          activeThreadId = newSession.id;
        }
      }

      // Save user messages to DB
      if (activeThreadId) {
        const userMessagesToSave = coreMessages
          .filter(m => m.role === 'user')
          .map(m => ({
            session_id: activeThreadId,
            role: 'user',
            content: m.content
          }));
        
        if (userMessagesToSave.length > 0) {
          // We only save the LAST user message to avoid duplicate saves in a continuous session
          const lastUserMsg = userMessagesToSave[userMessagesToSave.length - 1];
          const { error: msgErr } = await supabase.from('chat_messages').insert([lastUserMsg]);
          if (msgErr) console.error("Error saving user message:", msgErr);
        }
      }

      // 6. Auto-Summarization / Token Saving
      // If the conversation gets too long, we keep the system prompt, the first 2 messages, and the last 6 messages.
      // The middle messages are discarded to save tokens.
      let finalMessages = coreMessages;
      if (coreMessages.length > 12) {
        finalMessages = [
          ...coreMessages.slice(0, 2),
          { role: 'assistant', content: '[تم إخفاء بعض الرسائل القديمة لتوفير المساحة]' },
          ...coreMessages.slice(-8)
        ];
        console.log(`[Chat API] Trimmed ${coreMessages.length} messages down to ${finalMessages.length}`);
      }

      const result = streamText({
        model: client.chat(modelName),
        messages: finalMessages,
        system: augmentedSystemPrompt || undefined,
        onFinish: async ({ text, usage, finishReason }) => {
          reqMetrics.totalTimeMs = Date.now() - reqMetrics.startTime;

          // Emit structured log for the metrics dashboard/analysis
          console.log(JSON.stringify({
            event: "chat_metrics",
            timestamp: new Date().toISOString(),
            metrics: reqMetrics,
            usage: usage || {},
            finishReason: finishReason,
            session_id: activeThreadId
          }));

          if (activeThreadId && text) {
            // Save Assistant response
            const { error: astErr } = await supabase.from('chat_messages').insert([{
              session_id: activeThreadId,
              role: 'assistant',
              content: text
            }]);
            if (astErr) console.error("Error saving assistant message:", astErr);
          }
        }
      });

      console.log("[Chat API] Streaming response started");
      if (typeof (result as any).pipeDataStreamToResponse === 'function') {
        (result as any).pipeDataStreamToResponse(res);
      } else if (typeof (result as any).pipeUIMessageStreamToResponse === 'function') {
        (result as any).pipeUIMessageStreamToResponse(res);
      } else if (typeof (result as any).pipeTextStreamToResponse === 'function') {
        (result as any).pipeTextStreamToResponse(res);
      } else {
        throw new Error("No suitable method found to pipe the stream to the response. Available methods: " + Object.keys(Object.getPrototypeOf(result)).join(", "));
      }
    } catch (error) {
      console.error("[Chat API] Stream Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Internal Stream Error",
          details: error && typeof error === 'object' && 'message' in error ? error.message : String(error),
          fullError: error
        });
      }
    }
  })
);

// Get all threads
router.get("/threads", asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { supabase } = await import("../rag/store.js");
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, title, updated_at')
      .eq("user_id", userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json(sessions);
  } catch (err) {
    console.error("[Chat API] Error fetching threads:", err);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
}));

// Get messages for a specific thread
router.get("/threads/:id", asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const ownership = await ensureThreadOwnership(req, id);
    if ("error" in ownership) {
      const status = ownership.status ?? 404;
      return res.status(status).json({ error: ownership.error });
    }

    const { supabase } = ownership;
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('id, role, content, is_pinned, created_at')
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(messages);
  } catch (err) {
    console.error("[Chat API] Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
}));

// Pin or unpin a message
router.patch("/messages/:id/pin", asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { is_pinned } = req.body;
    const { supabase } = await import("../rag/store.js");

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: messageRow, error: messageLookupError } = await supabase
      .from("chat_messages")
      .select("id, session_id, chat_sessions!inner(user_id)")
      .eq("id", id)
      .eq("chat_sessions.user_id", userId)
      .maybeSingle();

    if (messageLookupError) {
      throw messageLookupError;
    }

    if (!messageRow) {
      return res.status(404).json({ error: "Message not found" });
    }

    const { error } = await supabase
      .from('chat_messages')
      .update({ is_pinned })
      .eq('id', id)
      .eq("session_id", messageRow.session_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("[Chat API] Error pinning message:", err);
    res.status(500).json({ error: "Failed to pin message" });
  }
}));

// Submit feedback for a message
router.patch("/messages/:id/feedback", asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { is_positive } = req.body; // true = thumbs up, false = thumbs down
    
    // Using structured logging to track feedback rating metrics easily
    console.log(JSON.stringify({
      event: "chat_feedback",
      timestamp: new Date().toISOString(),
      message_id: id,
      is_positive: is_positive
    }));

    // Optionally save to DB if there's a column for it:
    // await supabase.from('chat_messages').update({ feedback: is_positive }).eq('id', id);

    res.json({ success: true });
  } catch (err) {
    console.error("[Chat API] Error saving feedback:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
}));

export default router;
