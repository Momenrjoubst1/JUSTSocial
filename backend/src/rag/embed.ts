import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";
import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), "../.env.local");
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.warn(`[RAG] Warning: Could not load .env.local from ${envPath}`);
  // Try fallback to root .env
  dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
}

// The Google SDK expects GOOGLE_GENERATIVE_AI_API_KEY, but we have GOOGLE_API_KEY in .env.local
if (process.env.GOOGLE_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_API_KEY;
}

// We use gemini-embedding-001 with 768 dimensions to match the Supabase schema.
const embeddingModel = google.textEmbeddingModel("gemini-embedding-001");

/**
 * Generate an embedding for a single text string (e.g. user query).
 */
export async function generateEmbedding(text: string) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  // Slice to 768 if the model returns more (e.g. 3072) to match Supabase schema
  return embedding.length > 768 ? embedding.slice(0, 768) : embedding;
}

/**
 * Generate embeddings for an array of texts (e.g. document chunks).
 */
export async function generateEmbeddings(texts: string[]) {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });
  // Slice each embedding to 768 if the model returns more
  return embeddings.map(emb => emb.length > 768 ? emb.slice(0, 768) : emb);
}
