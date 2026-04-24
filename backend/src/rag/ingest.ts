import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import { chunkText } from "./chunk.js";
import { generateEmbeddings } from "./embed.js";
import { supabase } from "./store.js";

/**
 * Parses a PDF file and extracts its text.
 */
async function parsePDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

/**
 * Main ingestion function.
 * Give it a file path and metadata (e.g. { source: "my_book.pdf" })
 * and it will process and store it in Supabase vector DB.
 */
export async function ingestDocument(filePath: string, metadata: Record<string, any>) {
  console.log(`[RAG] Starting ingestion for: ${filePath}`);

  let rawText = "";
  if (filePath.toLowerCase().endsWith(".pdf")) {
    rawText = await parsePDF(filePath);
  } else {
    rawText = fs.readFileSync(filePath, "utf-8");
  }

  console.log(`[RAG] Extracted ${rawText.length} characters. Chunking...`);

  const chunks = chunkText(rawText, metadata);
  console.log(`[RAG] Created ${chunks.length} chunks. Generating embeddings...`);

  // Process in batches of 100 to avoid API rate limits (Google supports up to 100 per call)
  const BATCH_SIZE = 100;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const textsToEmbed = batch.map(c => c.text);

    let success = false;
    let retries = 0;
    const MAX_RETRIES = 5;

    while (!success && retries < MAX_RETRIES) {
      try {
        const embeddings = await generateEmbeddings(textsToEmbed);

        // Prepare records for Supabase
        const records = batch.map((chunk, index) => ({
          content: chunk.text,
          metadata: chunk.metadata,
          embedding: embeddings[index],
        }));

        // Insert into Supabase
        const { error } = await supabase.from("documents").insert(records);
        if (error) {
          throw new Error(`Supabase insert error: ${error.message}`);
        }

        console.log(`[RAG] Successfully inserted chunks ${i + 1} to ${i + batch.length}`);
        success = true;

        // Add a delay to avoid rate limits (2000ms for safety)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err: any) {
        retries++;
        const errorMsg = err.message || JSON.stringify(err);
        console.error(`[RAG] Error batch ${i} (Attempt ${retries}/${MAX_RETRIES}):`, errorMsg);

        if (errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota") || errorMsg.includes("429")) {
          console.log(`[RAG] Rate limit hit. Waiting 60s before retry to clear quota...`);
          await new Promise(resolve => setTimeout(resolve, 60000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    if (!success) {
      console.error(`[RAG] Failed to ingest batch starting at index ${i} after ${MAX_RETRIES} attempts. Skipping...`);
    }
  }

  console.log(`[RAG] Ingestion complete for: ${filePath}`);
}

// Example usage if you want to run this file directly via tsx:
// if (require.main === module) { ... }
