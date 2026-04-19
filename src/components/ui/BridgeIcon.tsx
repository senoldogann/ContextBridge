interface BridgeIconProps {
  className?: string;
  gradient?: boolean;
}

export function BridgeIcon({ className = "h-5 w-5", gradient = false }: BridgeIconProps) {
  const id = "cb-grad";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10a37f" />
          <stop offset="100%" stopColor="#4a7afe" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        fill={gradient ? `url(#${id})` : "currentColor"}
        opacity={gradient ? 1 : 0.12}
      />

      {/* "CB" letterforms */}
      <path
        d="M11.5 10.5C10 10.5 8.5 11.5 8.5 13.5V18.5C8.5 20.5 10 21.5 11.5 21.5H13"
        stroke={gradient ? "white" : "currentColor"}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M17 10.5H19.5C21 10.5 22.5 11.2 22.5 13C22.5 14.2 21.5 15 20.5 15.2C21.8 15.4 23 16.2 23 17.8C23 19.8 21.5 21.5 19.5 21.5H17V10.5Z"
        stroke={gradient ? "white" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
