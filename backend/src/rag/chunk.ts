/**
 * A simple utility to split large text into smaller chunks for embeddings.
 * For production, consider using 'langchain/text_splitter' RecursiveCharacterTextSplitter.
 */

export interface Chunk {
  text: string;
  metadata: Record<string, any>;
}

export function chunkText(text: string, metadata: Record<string, any> = {}, maxTokens = 2000, overlapToken = 200): Chunk[] {
  // Rough estimation: 1 token ~= 4 characters in English, slightly less in Arabic.
  // We use characters here for simplicity. 2000 tokens ~= 8000 characters.
  const chunkSize = maxTokens * 4;
  const overlapSize = overlapToken * 4;

  const chunks: Chunk[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    // Try to break at a natural boundary (newline or period)
    // ONLY if the boundary is at least 50% into the chunk size to avoid tiny chunks
    if (endIndex < text.length) {
      let boundaryIndex = text.lastIndexOf("\n\n", endIndex);
      if (boundaryIndex <= startIndex + (chunkSize / 2)) {
        boundaryIndex = text.lastIndexOf(".", endIndex);
      }
      
      // Only use the boundary if it's far enough from the start
      if (boundaryIndex > startIndex + (chunkSize / 2)) {
        endIndex = boundaryIndex + 1;
      }
    }

    const chunkStr = text.slice(startIndex, endIndex).trim();
    if (chunkStr.length > 0) {
      chunks.push({
        text: chunkStr,
        metadata,
      });
    }

    // Move forward. If we are at the end, break.
    if (endIndex >= text.length) break;

    // Move forward by chunk size minus overlap, ensuring we move at least 1 char
    startIndex = Math.max(endIndex - overlapSize, startIndex + 1);
  }

  return chunks;
}
