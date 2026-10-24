export const theme = {
  colors: {
    primary: "#4F46E5",
    primaryHover: "#4338CA",
    background: "#F9FAFB",
    surface: "#FFFFFF",
    textMain: "#111827",
    textMuted: "#6B7280",
    border: "#E5E7EB",
    error: "#EF4444",
    success: "#10B981",
  },
  spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
  borderRadius: { sm: "4px", md: "8px", lg: "12px" },
  fonts: { main: "system-ui, -apple-system, sans-serif" },
};

// Shared component styles
export const commonStyles = {
  container: {
    minHeight: "100vh",
    backgroundColor: theme.colors.background,
    fontFamily: theme.fonts.main,
    color: theme.colors.textMain,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    width: "100%",
    maxWidth: "400px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    marginBottom: theme.spacing.md,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    fontSize: "1rem",
    boxSizing: "border-box",
    fontFamily: theme.fonts.main,
  },
  button: (isHovered, disabled = false) => ({
    width: "100%",
    padding: "10px 16px",
    backgroundColor: disabled
      ? theme.colors.textMuted
      : isHovered
        ? theme.colors.primaryHover
        : theme.colors.primary,
    color: theme.colors.surface,
    border: "none",
    borderRadius: theme.borderRadius.md,
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background-color 0.2s",
  }),
  errorText: {
    color: theme.colors.error,
    fontSize: "0.875rem",
    marginBottom: theme.spacing.sm,
  },
};
