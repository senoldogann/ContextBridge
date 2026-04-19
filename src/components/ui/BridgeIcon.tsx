interface BridgeIconProps {
  className?: string;
  gradient?: boolean;
}

export function BridgeIcon({ className = "h-5 w-5", gradient = false }: BridgeIconProps) {
  const id = "bridge-grad";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>

      {/* Deck / road */}
      <line
        x1="2"
        y1="24"
        x2="30"
        y2="24"
        stroke={gradient ? `url(#${id})` : "currentColor"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Main arch cable */}
      <path
        d="M4 24 Q16 6 28 24"
        stroke={gradient ? `url(#${id})` : "currentColor"}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Vertical hangers */}
      {[9, 14, 18, 23].map((x) => {
        // y on the parabola: y = 6 + ((x-16)^2 / 19.2) roughly
        const y = Math.round(6 + (x - 16) ** 2 / 19.2);
        return (
          <line
            key={x}
            x1={x}
            y1={y}
            x2={x}
            y2={24}
            stroke={gradient ? `url(#${id})` : "currentColor"}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        );
      })}
    </svg>
  );
}
