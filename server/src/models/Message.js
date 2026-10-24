import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: { type: String, required: true },
    sources: [
      {
        documentTitle: String,
        filePath: String, // NEW: Added so we know which file to load in the iframe
        page: Number,
        text: String,
        score: Number,
      },
    ],
  },
  { timestamps: true },
);

export const Message = mongoose.model("Message", messageSchema);
