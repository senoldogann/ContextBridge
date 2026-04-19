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
    <div className="flex items-center justify-between bg-blue-900/60 px-4 py-2 text-sm text-blue-100">
      {state.phase === "available" && (
        <>
          <span>Update available: v{state.version}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUpdate}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
            >
              Update Now
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded px-3 py-1 text-xs text-blue-300 hover:bg-blue-800"
            >
              Later
            </button>
          </div>
        </>
      )}

      {state.phase === "downloading" && (
        <div className="flex w-full items-center gap-3">
          <span>Downloading update…</span>
          <div className="h-2 flex-1 rounded-full bg-blue-950">
            <div
              className="h-2 rounded-full bg-blue-400 transition-all"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <span className="text-xs">{state.progress}%</span>
        </div>
      )}

      {state.phase === "ready" && <span>Update installed — restarting…</span>}

      {state.phase === "error" && (
        <>
          <span className="text-red-300">Update error: {state.message}</span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="ml-4 rounded px-2 py-0.5 text-xs text-red-300 hover:bg-red-800"
          >
            Dismiss
          </button>
        </>
      )}
    </div>
  );
}
