import { GoogleGenAI } from "@google/genai";

// Helper function to pause execution for a set number of milliseconds
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Converts an array of text strings into vector embeddings using Gemini.
 * Includes batching (max 50 at a time) and exponential backoff for rate limits.
 */
export const generateEmbeddings = async (chunksText) => {
  // FIX: Initialize the AI client INSIDE the function.
  // This guarantees dotenv has already loaded process.env from server.js.
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from the .env file!");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const embeddings = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < chunksText.length; i += BATCH_SIZE) {
    const batch = chunksText.slice(i, i + BATCH_SIZE);

    let retries = 0;
    let success = false;

    while (!success && retries < 5) {
      try {
        const response = await ai.models.embedContent({
          model: process.env.EMBEDDING_MODEL || "text-embedding-004",
          contents: batch,
        });

        if (i === 0 && retries === 0 && response.embeddings?.length > 0) {
          console.log(
            `🧠 Embedding generated! Dimension size: ${response.embeddings[0].values.length}`,
          );
        }

        response.embeddings.forEach((emb) => {
          embeddings.push(emb.values);
        });

        success = true;
      } catch (error) {
        if (error.status === 429) {
          retries++;
          const waitTime = Math.pow(2, retries) * 1000;
          console.warn(
            `⏳ Rate limit hit. Retrying batch ${i / BATCH_SIZE + 1} in ${waitTime}ms...`,
          );
          await delay(waitTime);
        } else {
          throw error;
        }
      }
    }

    if (!success) {
      throw new Error(
        "Failed to generate embeddings after 5 retries due to strict rate limits.",
      );
    }
  }

  return embeddings;
};
