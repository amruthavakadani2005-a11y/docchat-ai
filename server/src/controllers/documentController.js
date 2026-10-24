import fs from "fs/promises";
import { Document } from "../models/Document.js";
import { Chunk } from "../models/Chunk.js";
import { AppError } from "../middleware/errorHandler.js";
import { extractTextFromPDF, chunkText } from "../services/pdfService.js";
import { generateEmbeddings } from "../services/embeddingService.js";

// --- REAL Background Job ---
// This processes the file asynchronously without blocking the HTTP response
const processDocumentJob = async (documentId, filePath, userId) => {
  try {
    console.log(`⚙️ Starting processing for document: ${documentId}`);

    // 1. Extract raw text from the PDF
    const pagesData = await extractTextFromPDF(filePath);
    console.log(`✅ Extracted ${pagesData.length} pages.`);

    // 2. Chunk the text into overlapping pieces
    const chunks = chunkText(pagesData);
    console.log(`✅ Chopped into ${chunks.length} chunks.`);

    // 3. Send the chunk texts to Gemini to get embedding vectors
    const chunkTextsArray = chunks.map((c) => c.text);
    const embeddings = await generateEmbeddings(chunkTextsArray);
    console.log(`✅ Generated ${embeddings.length} embeddings.`);

    // 4. Combine the text, metadata, and vectors, then save to MongoDB
    const chunkDocs = chunks.map((chunk, index) => ({
      documentId: documentId,
      userId: userId,
      text: chunk.text,
      page: chunk.page,
      chunkIndex: chunk.chunkIndex,
      embedding: embeddings[index],
    }));

    // insertMany is much faster than saving one by one in a loop
    await Chunk.insertMany(chunkDocs);
    console.log(`✅ Saved ${chunkDocs.length} vectorized chunks to database.`);

    // 5. Update the document status to ready
    await Document.findByIdAndUpdate(documentId, {
      status: "ready",
      pageCount: pagesData.length,
    });
    console.log(`🎉 Document ${documentId} is ready!`);
  } catch (error) {
    console.error(`❌ Processing failed for ${documentId}:`, error.message);
    // Mark as failed so the frontend UI can show the red error badge
    await Document.findByIdAndUpdate(documentId, {
      status: "failed",
      errorMessage: error.message,
    });
  }
};

// @desc    Upload a new PDF
// @route   POST /api/documents
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("No file uploaded or file is not a PDF.", 400);
    }

    const doc = await Document.create({
      userId: req.user._id,
      title: req.file.originalname.replace(".pdf", ""),
      originalName: req.file.originalname,
      filePath: req.file.path,
      status: "processing",
    });

    // Fire off the real background job (Notice we DO NOT use 'await' here)
    processDocumentJob(doc._id, doc.filePath, req.user._id);

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all documents for logged in user
// @route   GET /api/documents
export const getDocuments = async (req, res, next) => {
  try {
    const docs = await Document.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: docs });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a document, its file, and its chunks
// @route   DELETE /api/documents/:id
export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!doc) {
      throw new AppError("Document not found or unauthorized", 404);
    }

    try {
      await fs.unlink(doc.filePath);
    } catch (err) {
      console.warn(
        `File ${doc.filePath} not found on disk, continuing deletion...`,
      );
    }

    await Chunk.deleteMany({ documentId: doc._id });
    await Document.findByIdAndDelete(doc._id);

    res
      .status(200)
      .json({ success: true, message: "Document deleted completely" });
  } catch (error) {
    next(error);
  }
};
