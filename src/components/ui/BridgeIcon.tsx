interface BridgeIconProps {
  className?: string;
  gradient?: boolean;
}

export function BridgeIcon({ className = "h-5 w-5", gradient = false }: BridgeIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        width="64"
        height="64"
        rx="14"
        fill={gradient ? "#171717" : "currentColor"}
        opacity={gradient ? 1 : 0.12}
      />
      <path
        d="M12 40 C12 40 20 24 32 24 C44 24 52 40 52 40"
        stroke={gradient ? "#10a37f" : "currentColor"}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M12 40 C12 40 20 32 32 32 C44 32 52 40 52 40"
        stroke={gradient ? "#13c294" : "currentColor"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="40"
        x2="20"
        y2="28"
        stroke={gradient ? "#10a37f" : "currentColor"}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="32"
        y1="40"
        x2="32"
        y2="24"
        stroke={gradient ? "#10a37f" : "currentColor"}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="44"
        y1="40"
        x2="44"
        y2="28"
        stroke={gradient ? "#10a37f" : "currentColor"}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="40"
        x2="56"
        y2="40"
        stroke={gradient ? "#4a7afe" : "currentColor"}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
