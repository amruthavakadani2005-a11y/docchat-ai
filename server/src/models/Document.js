import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    pageCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing",
    },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

export const Document = mongoose.model("Document", documentSchema);
