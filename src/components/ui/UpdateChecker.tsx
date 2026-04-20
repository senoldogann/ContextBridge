import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type UpdateState =
  | { phase: "idle" }
  | { phase: "available"; version: string; body: string }
  | { phase: "downloading"; progress: number }
  | { phase: "ready" }
  | { phase: "error"; message: string };

export function UpdateChecker() {
  const [state, setState] = useState<UpdateState>({ phase: "idle" });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const update = await check();
        if (update) {
          setState({
            phase: "available",
            version: update.version,
            body: update.body ?? "",
          });
        }
      } catch {
        // Silently ignore update check failures
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  async function handleUpdate() {
    try {
      const update = await check();
      if (!update) return;

      let totalBytes = 0;
      let downloadedBytes = 0;

      setState({ phase: "downloading", progress: 0 });

      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalBytes = event.data.contentLength;
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
          setState({ phase: "downloading", progress: Math.round(progress) });
        } else if (event.event === "Finished") {
          setState({ phase: "ready" });
        }
      });

      setState({ phase: "ready" });
      await relaunch();
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Update failed",
      });
    }
  }

  if (dismissed || state.phase === "idle") return null;

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm backdrop-blur-sm"
      style={{
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {state.phase === "available" && (
        <>
          <span>Update available: v{state.version}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUpdate}
              className="rounded-lg px-3 py-1 text-xs font-medium transition-all hover:opacity-90"
              style={{
                background: "var(--primary)",
                color: "var(--bg-base)",
                boxShadow: "0 4px 12px var(--primary-ring)",
              }}
            >
              Update Now
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-lg px-3 py-1 text-xs transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              Later
            </button>
          </div>
        </>
      )}

      {state.phase === "downloading" && (
        <div className="flex w-full items-center gap-3">
          <span>Downloading update…</span>
          <div
            className="h-2 flex-1 overflow-hidden rounded-full"
            style={{ background: "var(--bg-input)" }}
          >
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ background: "var(--primary)", width: `${state.progress}%` }}
            />
          </div>
          <span className="text-xs">{state.progress}%</span>
        </div>
      )}

      {state.phase === "ready" && (
        <span style={{ color: "var(--alert-success-text)" }}>Update installed — restarting…</span>
      )}

      {state.phase === "error" && (
        <>
          <span style={{ color: "var(--alert-error-text)" }}>Update error: {state.message}</span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="ml-4 rounded px-2 py-0.5 text-xs"
            style={{ color: "var(--alert-error-text)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--alert-error-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            Dismiss
          </button>
        </>
      )}
    </div>
  );
}
