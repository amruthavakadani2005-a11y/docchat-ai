import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { connectDB } from "./src/config/db.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import {
  apiLimiter,
  chatLimiter,
  uploadLimiter,
} from "./src/middleware/rateLimiter.js";

import authRoutes from "./src/routes/authRoutes.js";
import documentRoutes from "./src/routes/documentRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";

dotenv.config();
connectDB();

const app = express();

// Trust proxy is required if deployed behind a load balancer (like Render) for accurate IP rate limiting
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

// Request size limit prevents malicious huge JSON payloads
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Apply global rate limiter
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/documents", uploadLimiter, documentRoutes);
app.use("/api/chat", chatLimiter, chatRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
