import fs from "fs/promises";
// Use the legacy build explicitly requested by the warning
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Define the chunking parameters
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 150;

/**
 * Extracts raw text from a PDF, keeping track of page numbers.
 */
export const extractTextFromPDF = async (filePath) => {
  // 1. Read the file from disk into a Node Buffer
  const fileBuffer = await fs.readFile(filePath);
  // 2. Convert it to the Uint8Array format that pdfjs-dist expects
  const data = new Uint8Array(fileBuffer);

  // 3. Pass the binary data directly into getDocument
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDocument = await loadingTask.promise;

  const pagesData = [];
  let totalTextLength = 0;

  // pdfjs-dist uses 1-based indexing for pages
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();

    // Combine the individual text items on the page into a single string
    const pageText = textContent.items.map((item) => item.str).join(" ");

    // Clean up excessive whitespace
    const cleanText = pageText.replace(/\s+/g, " ").trim();

    if (cleanText.length > 0) {
      pagesData.push({ page: i, text: cleanText });
      totalTextLength += cleanText.length;
    }
  }

  // Security & UX Check: Detect scanned or image-only PDFs
  if (totalTextLength < 50) {
    throw new Error(
      "No readable text found. The document might be an image-only or scanned PDF.",
    );
  }

  return pagesData;
};
/**
 * Splits extracted page text into intelligent overlapping chunks,
 * maintaining overlap seamlessly across page boundaries.
 */
export const chunkText = (pagesData) => {
  const chunks = [];
  let globalChunkIndex = 0;

  // 1. Move these OUTSIDE the page loop so memory isn't wiped on a new page
  let currentChunkSentences = [];
  let currentChunkLength = 0;
  let currentChunkStartPage = 1;

  for (const pageData of pagesData) {
    const { page, text } = pageData;
    
    // If we are starting a completely fresh chunk, log the page it started on
    if (currentChunkLength === 0) {
      currentChunkStartPage = page;
    }

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    for (const sentence of sentences) {
      const cleanSentence = sentence.trim() + " ";
      
      if (currentChunkLength + cleanSentence.length > CHUNK_SIZE && currentChunkLength > 0) {
        
        // Save the finished chunk
        chunks.push({
          text: currentChunkSentences.join('').trim(),
          page: currentChunkStartPage, // Use the page where this chunk began
          chunkIndex: globalChunkIndex++
        });

        // Build the overlap for the next chunk
        let overlapLength = 0;
        let overlapSentences = [];
        
        for (let i = currentChunkSentences.length - 1; i >= 0; i--) {
          const s = currentChunkSentences[i];
          if (overlapLength + s.length > CHUNK_OVERLAP) {
            if (overlapLength === 0) {
                overlapSentences.unshift(s);
            }
            break;
          }
          overlapSentences.unshift(s);
          overlapLength += s.length;
        }

        // Reset the current chunk for the next iteration
        currentChunkSentences = [...overlapSentences, cleanSentence];
        currentChunkLength = overlapLength + cleanSentence.length;
        
        // The new chunk technically starts on the CURRENT page we are looping through
        currentChunkStartPage = page; 

      } else {
        currentChunkSentences.push(cleanSentence);
        currentChunkLength += cleanSentence.length;
      }
    }
  }

  // Flush any remaining text at the very end of the document
  if (currentChunkSentences.length > 0) {
    chunks.push({
      text: currentChunkSentences.join('').trim(),
      page: currentChunkStartPage,
      chunkIndex: globalChunkIndex++
    });
  }

  return chunks;
};