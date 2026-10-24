import { GoogleGenAI } from "@google/genai";
import { retrieveRelevantChunks } from "../services/retrievalService.js";
import { Chat } from "../models/Chat.js";
import { Message } from "../models/Message.js";
import { AppError } from "../middleware/errorHandler.js";

export const createChat = async (req, res, next) => {
  try {
    const { title, documentIds } = req.body;
    if (!documentIds || documentIds.length === 0)
      throw new AppError("Select at least one document.", 400);

    const chat = await Chat.create({
      userId: req.user._id,
      title: title || "New Chat",
      documentIds,
    });
    res.status(201).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

export const getChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: chats });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId }).sort({
      createdAt: 1,
    });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

export const streamMessage = async (req, res, next) => {
  try {
    const { question } = req.body;
    const { chatId } = req.params;
    if (!question) throw new AppError("Question is required", 400);

    const chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
    if (!chat) throw new AppError("Chat not found", 404);

    await Message.create({ chatId, role: "user", content: question });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    req.on("close", () => res.end());

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // --- 1. QUERY REWRITING ---
    // Fetch the last 4 messages to understand the conversation context
    const recentMessages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .limit(4);
    recentMessages.reverse(); // Put them in chronological order

    let standaloneQuestion = question;

    if (recentMessages.length > 1) {
      const historyText = recentMessages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");
      const rewritePrompt = `Given the conversation history, rewrite the user's latest question into a standalone query that can be understood without context. Replace pronouns with specific nouns. If the question is already clear, output it exactly as is. DO NOT answer the question. \n\nHistory:\n${historyText}\n\nLatest Question: ${question}\n\nStandalone Question:`;

      try {
        const rewriteResponse = await ai.models.generateContent({
          model: process.env.CHAT_MODEL || "gemini-2.5-flash",
          contents: rewritePrompt,
        });
        standaloneQuestion = rewriteResponse.text.trim();
        console.log(`\n🔄 Rewrote "${question}" -> "${standaloneQuestion}"`);
      } catch (err) {
        console.warn("Failed to rewrite query, falling back to original.");
      }
    }

    // --- 2. VECTOR SEARCH (Using the rewritten question) ---
    const chunks = await retrieveRelevantChunks(
      standaloneQuestion,
      req.user._id,
      chat.documentIds,
    );

    // Ensure file paths use forward slashes for URLs, even if hosted on Windows
    const sources = chunks.map((c) => ({
      documentTitle: c.documentTitle,
      filePath: c.filePath.replace(/\\/g, "/"),
      page: c.page,
      text: c.text,
      score: c.score,
    }));

    if (chunks.length === 0 || chunks[0].score < 0.65) {
      const fallback =
        "I could not find the answer to this question in your selected documents.";
      res.write(`data: ${JSON.stringify({ text: fallback })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, sources: [] })}\n\n`);
      await Message.create({
        chatId,
        role: "assistant",
        content: fallback,
        sources: [],
      });
      return res.end();
    }

    // --- 3. GENERATION ---
    let contextText = "";
    chunks.forEach((chunk, i) => {
      contextText += `\n--- SOURCE ${i + 1} (${chunk.documentTitle}, Pg ${chunk.page}) ---\n${chunk.text}\n`;
    });

    const prompt = `You are an expert AI answering questions based strictly on the uploaded documents.
CONTEXT:\n${contextText}
QUESTION:\n${standaloneQuestion}
RULES: Answer ONLY using the CONTEXT. Cite sources as (Source: Title, Page X).`;

    const stream = await ai.models.generateContentStream({
      model: process.env.CHAT_MODEL || "gemini-2.5-flash",
      contents: prompt,
    });

    let fullAssistantResponse = "";
    for await (const chunk of stream) {
      fullAssistantResponse += chunk.text;
      res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
    }

    await Message.create({
      chatId,
      role: "assistant",
      content: fullAssistantResponse,
      sources,
    });
    res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Stream Error:", error);
    res.write(
      `data: ${JSON.stringify({ error: "An error occurred during generation." })}\n\n`,
    );
    res.end();
  }
};
