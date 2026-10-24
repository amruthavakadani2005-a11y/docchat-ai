import fs from "fs";
import path from "path";
import { extractTextFromPDF, chunkText } from "./src/services/pdfService.js";

const test = async () => {
  // We assume you have a sample.pdf in your server folder
  const pdfPath = path.resolve("./sample.pdf");

  if (!fs.existsSync(pdfPath)) {
    console.error(
      '❌ Please put a PDF named "sample.pdf" in the server folder first!',
    );
    process.exit(1);
  }

  try {
    console.log("📄 1. Extracting text from PDF...");
    const pages = await extractTextFromPDF(pdfPath);
    console.log(`✅ Extracted ${pages.length} pages of text.`);

    console.log("\n🔪 2. Chunking text...");
    const chunks = chunkText(pages);

    console.log(
      `✅ Created ${chunks.length} total chunks. Here are the first 3:\n`,
    );

    chunks.slice(0, 3).forEach((chunk) => {
      console.log(`--- CHUNK ${chunk.chunkIndex} (Page ${chunk.page}) ---`);
      console.log(chunk.text);
      console.log(`[Length: ${chunk.text.length} chars]\n`);
    });
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
};

test();
