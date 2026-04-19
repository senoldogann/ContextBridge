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
        "relative rounded-xl border border-zinc-800/50 bg-zinc-900/80 p-4 backdrop-blur-sm",
        "shadow-lg ring-1 shadow-black/20 ring-zinc-800/50",
        "transition-all duration-200",
        hoverable &&
          "cursor-pointer hover:scale-[1.01] hover:bg-zinc-800/80 hover:shadow-xl hover:shadow-black/30 hover:ring-zinc-700/50",
        onClick &&
          "w-full cursor-pointer text-left hover:scale-[1.01] hover:bg-zinc-800/80 hover:shadow-xl hover:shadow-black/30 hover:ring-zinc-700/50",
        className,
      )}
    >
      {children}
    </Component>
  );
}
