import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
  const win = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="flex h-9 shrink-0 items-center justify-between bg-zinc-900/90 px-3 backdrop-blur-xl"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* macOS traffic lights placeholder — Tauri draws real ones at left */}
      <div
        className="flex items-center gap-1.5"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => win.close()}
          className="h-3 w-3 rounded-full bg-red-500 transition-colors hover:bg-red-400"
        />
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => win.minimize()}
          className="h-3 w-3 rounded-full bg-yellow-500 transition-colors hover:bg-yellow-400"
        />
        <button
          type="button"
          aria-label="Maximize"
          onClick={() => win.toggleMaximize()}
          className="h-3 w-3 rounded-full bg-green-500 transition-colors hover:bg-green-400"
        />
      </div>

      <span className="absolute left-1/2 -translate-x-1/2 text-xs font-medium text-zinc-500 select-none">
        ContextBridge
      </span>
    </div>
  );
}
