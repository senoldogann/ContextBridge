import { useEffect } from "react";
import { Plus } from "lucide-react";
import { clsx } from "clsx";
import { useProjectStore } from "@/stores/projectStore";
import { ProjectCard } from "@/components/projects/ProjectCard";

export function Sidebar() {
  const projects = useProjectStore((s) => s.projects);
  const selectedProject = useProjectStore((s) => s.selectedProject);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const selectProject = useProjectStore((s) => s.selectProject);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleAddProject = () => {
    // TODO(#1): integrate @tauri-apps/plugin-dialog for native folder picker
    console.warn("Native folder picker not yet implemented");
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-zinc-300">ContextBridge</h1>
        <button
          type="button"
          onClick={handleAddProject}
          className={clsx(
            "rounded-md p-1.5 text-zinc-400 transition-colors",
            "hover:bg-zinc-800 hover:text-zinc-200",
          )}
          aria-label="Add project"
        >
          <Plus size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-zinc-500">No projects yet</p>
        ) : (
          <ul className="space-y-1">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard
                  project={project}
                  isSelected={selectedProject?.id === project.id}
                  onSelect={() => selectProject(project.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}
