import type { Project } from "@/types";
import { EmptyState } from "@/components/projects/EmptyState";

interface MainContentProps {
  project: Project | null;
}

export function MainContent({ project }: MainContentProps) {
  if (!project) {
    return <EmptyState />;
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <p className="mt-1 text-xs text-zinc-400">{project.root_path}</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="mb-2 text-sm font-medium text-zinc-300">Project Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">ID</dt>
              <dd className="font-mono text-xs text-zinc-400">{project.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Created</dt>
              <dd className="text-zinc-400">
                {new Date(project.created_at).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Updated</dt>
              <dd className="text-zinc-400">
                {new Date(project.updated_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
