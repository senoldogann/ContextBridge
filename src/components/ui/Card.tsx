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
        "rounded-lg border border-zinc-800 bg-zinc-900 p-4",
        hoverable && "cursor-pointer transition-colors hover:border-zinc-700 hover:bg-zinc-800/80",
        onClick &&
          "w-full cursor-pointer text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/80",
        className,
      )}
    >
      {children}
    </Component>
  );
}
