import { clsx } from "clsx";
import { motion } from "framer-motion";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        style={{
          background: checked ? "var(--primary)" : "var(--bg-hover)",
          boxShadow: checked ? "0 0 8px var(--primary-ring)" : `inset 0 0 0 1px var(--border)`,
        }}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow"
          style={{ x: checked ? 18 : 2 }}
        />
      </button>
      {label && (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
      )}
    </label>
  );
}
