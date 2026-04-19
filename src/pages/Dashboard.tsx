import { useEffect } from "react";
import { FolderOpen, Plus, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useProjectStore } from "@/stores/projectStore";
import { useNavigationStore } from "@/stores/navigationStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/projects/EmptyState";
import { useAddProject } from "@/hooks/useAddProject";

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.2, ease: "easeOut" as const },
  }),
};

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
      <header className="border-b border-zinc-800/50 px-6 py-4">
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
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card hoverable onClick={() => handleOpenProject(project.id)}>
                {/* Gradient accent strip */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                <div className="relative flex items-start gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-indigo-600/20 to-indigo-500/10 p-2 ring-1 ring-indigo-500/20">
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
            </motion.div>
          ))}

          {/* Add project card */}
          <motion.button
            type="button"
            onClick={handleAddProject}
            className="group flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700/50 bg-transparent p-4 text-zinc-500 transition-all duration-200 hover:border-indigo-500/50 hover:text-zinc-300 hover:shadow-lg hover:shadow-indigo-500/5"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Add new project"
          >
            <div className="rounded-full bg-zinc-800/50 p-2 transition-colors group-hover:bg-indigo-600/20">
              <Plus size={24} />
            </div>
            <span className="text-sm font-medium">Add Project</span>
          </motion.button>
        </div>
      </div>
    </main>
  );
}
