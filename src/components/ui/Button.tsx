import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? {
          background: "var(--accent-gradient)",
          color: "#ffffff",
          boxShadow: "0 2px 8px var(--primary-ring)",
        }
      : variant === "secondary"
        ? {
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            boxShadow: `inset 0 0 0 1px var(--border)`,
          }
        : variant === "danger"
          ? {
              background: "linear-gradient(135deg, #dc2626, #ef4444)",
              color: "#ffffff",
              boxShadow: "0 2px 8px rgba(220,38,38,0.25)",
            }
          : {
              background: "transparent",
              color: "var(--text-muted)",
            };

  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium",
        "transition-all duration-150",
        "hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
        sizeStyles[size],
        className,
      )}
      style={variantStyle}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
