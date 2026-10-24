# DocChat AI

An enterprise-grade Retrieval-Augmented Generation (RAG) platform that allows users to upload PDFs and converse with their data in real-time. Built with the MERN stack, MongoDB Atlas Vector Search, and Google Gemini API.

## 🚀 Features
- **Real-time SSE Streaming:** Token-by-token streaming chat interface (ChatGPT style).
- **Intelligent Chunking:** Per-page PDF text extraction with 800-character chunking and 150-character overlap for context retention.
- **Tenant Isolation:** Strict JWT-based document isolation ensuring users can only query their own private data.
- **Contextual Query Rewriting:** Uses an LLM to rewrite pronoun-heavy follow-up questions into standalone queries before vector search.
- **Split-Screen Citations:** Verifiable AI answers with interactive citation cards that open the exact source page in a built-in PDF viewer.

## 🧠 Architecture
```mermaid
graph TD
    A[User] -->|Upload PDF| B(React Frontend)
    B -->|Multipart Form| C(Express Backend)
    C -->|pdfjs-dist Extract| D[Chunking Engine]
    D -->|Text Batches| E(Gemini Embedding Model)
    E -->|768d/3072d Vectors| F[(MongoDB Atlas)]
    A -->|Chat Message| B
    B -->|SSE Request| C
    C -->|Query Rewrite| G(Gemini Chat Model)
    G -->|Embed Query| E
    E -->|Query Vector| F
    F -->|Top-K Chunks| C
    C -->|Strict Prompt| G
    G -->|Stream Tokens| B