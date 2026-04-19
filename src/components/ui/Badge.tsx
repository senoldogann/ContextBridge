import { clsx } from "clsx";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-zinc-800 text-zinc-300 ring-zinc-700/50",
  primary: "bg-indigo-600/20 text-indigo-400 ring-indigo-500/30",
  success: "bg-emerald-600/20 text-emerald-400 ring-emerald-500/30",
  warning: "bg-amber-600/20 text-amber-400 ring-amber-500/30",
  danger: "bg-red-600/20 text-red-400 ring-red-500/30",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-zinc-400",
  primary: "bg-indigo-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
};

export function Badge({ children, variant = "default", className, dot = false }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        "ring-1 ring-inset",
        variantStyles[variant],
        className,
      )}
    >
      {dot && <span className={clsx("mr-1.5 h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
