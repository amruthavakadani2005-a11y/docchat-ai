import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true },
    page: { type: Number, required: true },
    chunkIndex: { type: Number, required: true },
    embedding: { type: [Number] }, // We will populate this array in Stage 6
  },
  { timestamps: true },
);

export const Chunk = mongoose.model("Chunk", chunkSchema);
