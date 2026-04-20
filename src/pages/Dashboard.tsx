import { useEffect } from "react";
import { FolderOpen, Plus, Activity, Loader2 } from "lucide-react";
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

const dashboardCardClassName = "flex h-full min-h-[132px] flex-col justify-between";

export function Dashboard() {
  const projects = useProjectStore((s) => s.projects);
  const isAddingProject = useProjectStore((s) => s.isAddingProject);
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
    <main className="theme-transition flex flex-1 flex-col overflow-hidden">
      <header className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Dashboard
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
              {projects.length} project{projects.length !== 1 ? "s" : ""} registered
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="h-full"
            >
              <Card
                className={dashboardCardClassName}
                hoverable
                onClick={() => handleOpenProject(project.id)}
              >
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, var(--primary), transparent)",
                    opacity: 0.4,
                  }}
                />
                <div className="relative flex items-start gap-3">
                  <div
                    className="rounded-lg p-2"
                    style={{
                      background: "var(--primary-muted)",
                      boxShadow: `inset 0 0 0 1px var(--primary-ring)`,
                    }}
                  >
                    <FolderOpen size={18} style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="truncate text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {project.name}
                    </h3>
                    <p
                      className="mt-0.5 truncate text-xs"
                      style={{ color: "var(--text-muted)" }}
                      title={project.root_path}
                    >
                      {project.root_path}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity size={12} style={{ color: "var(--text-muted)" }} />
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
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
            disabled={isAddingProject}
            className="group flex h-full min-h-[132px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-all duration-200"
            style={{
              borderColor: "var(--border-dashed)",
              color: "var(--text-muted)",
              background: "transparent",
              opacity: isAddingProject ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (isAddingProject) {
                return;
              }
              (e.currentTarget as HTMLElement).style.borderColor = "var(--primary-ring)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
              (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-dashed)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
            whileHover={isAddingProject ? undefined : { scale: 1.02 }}
            whileTap={isAddingProject ? undefined : { scale: 0.98 }}
            aria-label="Add new project"
          >
            <div
              className="rounded-full p-2 transition-colors"
              style={{ background: "var(--bg-hover)" }}
            >
              {isAddingProject ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Plus size={24} />
              )}
            </div>
            <span className="text-sm font-medium">
              {isAddingProject ? "Indexing project..." : "Add Project"}
            </span>
            {isAddingProject && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Scanning files and preparing context outputs
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </main>
  );
}
