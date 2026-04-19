import { useEffect } from "react";
import { Plus, LayoutDashboard, Settings, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { useProjectStore } from "@/stores/projectStore";
import { useNavigationStore } from "@/stores/navigationStore";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { useAddProject } from "@/hooks/useAddProject";

export function Sidebar() {
  const projects = useProjectStore((s) => s.projects);
  const selectedProject = useProjectStore((s) => s.selectedProject);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const selectProject = useProjectStore((s) => s.selectProject);
  const removeProject = useProjectStore((s) => s.removeProject);
  const currentView = useNavigationStore((s) => s.currentView);
  const navigate = useNavigationStore((s) => s.navigate);
  const handleAddProject = useAddProject();

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleSelectProject = (projectId: string) => {
    selectProject(projectId);
    navigate("project");
  };

  const handleRemoveProject = async (projectId: string) => {
    const confirmed = window.confirm("Remove this project from ContextBridge?");
    if (confirmed) {
      await removeProject(projectId);
      if (selectedProject?.id === projectId) {
        navigate("dashboard");
      }
    }
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
              <li key={project.id} className="group relative">
                <ProjectCard
                  project={project}
                  isSelected={selectedProject?.id === project.id && currentView === "project"}
                  onSelect={() => handleSelectProject(project.id)}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRemoveProject(project.id);
                  }}
                  className="absolute top-2.5 right-2 hidden rounded-md p-1 text-zinc-600 transition-colors group-hover:block hover:bg-zinc-700 hover:text-red-400"
                  aria-label={`Remove project ${project.name}`}
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t border-zinc-800 p-2">
        <button
          type="button"
          onClick={() => navigate("dashboard")}
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            currentView === "dashboard"
              ? "bg-indigo-600/20 text-indigo-400"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
          )}
          aria-label="Dashboard"
        >
          <LayoutDashboard size={16} />
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => navigate("settings")}
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            currentView === "settings"
              ? "bg-indigo-600/20 text-indigo-400"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
          )}
          aria-label="Settings"
        >
          <Settings size={16} />
          Settings
        </button>
      </div>
    </aside>
  );
}
