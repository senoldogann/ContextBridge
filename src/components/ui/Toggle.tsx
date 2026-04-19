import { clsx } from "clsx";

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
          "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-indigo-600" : "bg-zinc-700",
        )}
      >
        <span
          className={clsx(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
            "translate-y-0.5",
            checked ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </button>
      {label && <span className="text-sm text-zinc-300">{label}</span>}
    </label>
  );
}
