import { FolderOpen } from "lucide-react";

export function EmptyState() {
  const handleAdd = () => {
    // TODO(#1): integrate @tauri-apps/plugin-dialog for native folder picker
    console.warn("Native folder picker not yet implemented");
  };

  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-zinc-800 p-4">
          <FolderOpen size={32} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-200">No project selected</h2>
          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            Add your first project to start generating AI-ready context files.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Add Project
        </button>
      </div>
    </main>
  );
}
