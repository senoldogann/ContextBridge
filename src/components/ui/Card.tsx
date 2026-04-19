import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className, onClick, hoverable = false }: CardProps) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={clsx(
        "theme-transition relative rounded-xl p-4 backdrop-blur-sm",
        "shadow-lg transition-all duration-200",
        hoverable && "cursor-pointer hover:scale-[1.01] hover:shadow-xl",
        onClick && "w-full cursor-pointer text-left hover:scale-[1.01] hover:shadow-xl",
        className,
      )}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {children}
    </Component>
  );
}
