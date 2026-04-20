import { clsx } from "clsx";

type ToolId = "claude" | "cursor" | "copilot" | "codex";

const TOOL_ICON_PATHS: Record<ToolId, string> = {
  claude: "/tool-icons/claude.svg",
  cursor: "/tool-icons/cursor.svg",
  copilot: "/tool-icons/copilot.svg",
  codex: "/tool-icons/codex.svg",
};

const TOOL_LABELS: Record<ToolId, string> = {
  claude: "Claude",
  cursor: "Cursor",
  copilot: "Copilot",
  codex: "Codex",
};

interface ToolLogoProps {
  tool: ToolId;
  size?: number;
  className?: string;
}

export function ToolLogo({ tool, size = 14, className }: ToolLogoProps) {
  const iconPath = TOOL_ICON_PATHS[tool];
  const label = TOOL_LABELS[tool];

  return (
    <span
      className={clsx("inline-block shrink-0", className)}
      role="img"
      aria-label={`${label} logo`}
      title={label}
      style={{
        width: size,
        height: size,
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${iconPath})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        maskImage: `url(${iconPath})`,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
      }}
    />
  );
}
