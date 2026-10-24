import rateLimit from "express-rate-limit";

// Global API Limiter: 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat Limiter: 20 messages per minute per IP (prevents draining Gemini quota)
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: "Chat rate limit exceeded. Please wait a minute.",
  },
});

// Upload Limiter: 5 uploads per hour per IP
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: "Upload limit reached (5 per hour). Please try again later.",
  },
});
