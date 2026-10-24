import mongoose from "mongoose";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { Chunk } from "../src/models/Chunk.js";
import { Document } from "../src/models/Document.js";

dotenv.config();

const evalRAG = async () => {
  console.log("🚀 Starting RAG Retrieval Evaluation...");
  await mongoose.connect(process.env.MONGO_URI);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const qaData = JSON.parse(fs.readFileSync("./eval/qa_pairs.json", "utf8"));

  // Test against the first ready document in the DB
  const doc = await Document.findOne({ status: "ready" });
  if (!doc) {
    console.error(
      "❌ No processed documents found in the database. Upload one first.",
    );
    process.exit(1);
  }

  console.log(`\nEvaluating against Document: "${doc.title}"\n`);
  let hits = 0;

  for (const item of qaData) {
    // 1. Embed question
    const response = await ai.models.embedContent({
      model: process.env.EMBEDDING_MODEL || "text-embedding-004",
      contents: [item.question],
    });
    const queryVector = response.embeddings[0].values;

    // 2. Retrieve Top-5 chunks
    const chunks = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryVector,
          numCandidates: 50,
          limit: 5,
          filter: { documentId: doc._id },
        },
      },
    ]);

    // 3. Check if the expected page is in the retrieved results
    const retrievedPages = chunks.map((c) => c.page);
    if (retrievedPages.includes(item.expectedPage)) {
      hits++;
      console.log(
        `✅ HIT: "${item.question}" (Found target page ${item.expectedPage})`,
      );
    } else {
      console.log(
        `❌ MISS: "${item.question}" (Expected ${item.expectedPage}, retrieved [${retrievedPages.join(", ")}])`,
      );
    }
  }

  const hitRate = (hits / qaData.length) * 100;
  console.log(`\n📊 FINAL TOP-5 HIT RATE: ${hitRate}%`);
  console.log(
    "If Hit Rate is low, try increasing chunk size or adjusting overlap!",
  );

  process.exit(0);
};

evalRAG();
