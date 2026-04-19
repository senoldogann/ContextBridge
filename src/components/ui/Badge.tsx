import { clsx } from "clsx";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {},
  primary: {},
  success: {},
  warning: {},
  danger: {},
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "",
  primary: "bg-indigo-500/15 text-indigo-400 ring-indigo-500/25",
  success: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  warning: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
  danger: "bg-red-500/15 text-red-400 ring-red-500/25",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "",
  primary: "bg-indigo-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
};

export function Badge({ children, variant = "default", className, dot = false }: BadgeProps) {
  const isDefault = variant === "default";
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        "ring-1 ring-inset",
        !isDefault && variantClasses[variant],
        className,
      )}
      style={
        isDefault
          ? {
              background: "var(--bg-badge)",
              color: "var(--text-badge)",
              boxShadow: "inset 0 0 0 1px var(--border)",
            }
          : variantStyles[variant]
      }
    >
      {dot && (
        <span
          className={clsx("mr-1.5 h-1.5 w-1.5 rounded-full", isDefault ? "" : dotColors[variant])}
          style={isDefault ? { background: "var(--text-muted)" } : undefined}
        />
      )}
      {children}
    </span>
  );
}
