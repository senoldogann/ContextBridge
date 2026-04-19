import { useEffect } from "react";
import { FolderOpen, Plus, Activity } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useNavigationStore } from "@/stores/navigationStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/projects/EmptyState";
import { useAddProject } from "@/hooks/useAddProject";

export function Dashboard() {
  const projects = useProjectStore((s) => s.projects);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const selectProject = useProjectStore((s) => s.selectProject);
  const navigate = useNavigationStore((s) => s.navigate);
  const handleAddProject = useAddProject();

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleOpenProject = (projectId: string) => {
    selectProject(projectId);
    navigate("project");
  };

  if (projects.length === 0) {
    return <EmptyState />;
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Dashboard</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {projects.length} project{projects.length !== 1 ? "s" : ""} registered
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} hoverable onClick={() => handleOpenProject(project.id)}>
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-zinc-800 p-2">
                  <FolderOpen size={18} className="text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-zinc-100">{project.name}</h3>
                  <p className="mt-0.5 truncate text-xs text-zinc-500" title={project.root_path}>
                    {project.root_path}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity size={12} className="text-zinc-500" />
                  <span className="text-[10px] text-zinc-500">
                    Updated {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <Badge variant="primary">project</Badge>
              </div>
            </Card>
          ))}

          {/* Add project card */}
          <button
            type="button"
            onClick={handleAddProject}
            className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-700 bg-transparent p-4 text-zinc-500 transition-colors hover:border-indigo-500/50 hover:text-zinc-300"
            aria-label="Add new project"
          >
            <Plus size={24} />
            <span className="text-sm font-medium">Add Project</span>
          </button>
        </div>
      </div>
    </main>
  );
}
