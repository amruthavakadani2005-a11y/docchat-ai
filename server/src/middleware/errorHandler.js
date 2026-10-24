// Centralized error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    error: message,
    // Only send the stack trace in development for debugging
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

// Helper class for throwing custom errors with status codes
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // Capture the stack trace, excluding the constructor call itself
    Error.captureStackTrace(this, this.constructor);
  }
}
