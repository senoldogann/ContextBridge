import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAddProject } from "@/hooks/useAddProject";

export function EmptyState() {
  const handleAdd = useAddProject();

  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-zinc-800 p-4">
          <FolderOpen size={32} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-200">No projects yet</h2>
          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            Add your first project to start generating AI-ready context files.
          </p>
        </div>
        <Button onClick={handleAdd} aria-label="Add your first project">
          Add Project
        </Button>
      </div>
    </main>
  );
}
