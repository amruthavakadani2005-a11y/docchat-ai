// Middleware to validate request bodies against Zod schemas using safeParse
export const validateRequest = (schema) => {
  return (req, res, next) => {
    // safeParse evaluates the data without throwing exceptions
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // result.error is strictly typed as a ZodError, so .issues is guaranteed to exist
      const errorMessages = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");

      return res.status(400).json({ success: false, error: errorMessages });
    }

    // Validation passed, proceed to the controller
    next();
  };
};
