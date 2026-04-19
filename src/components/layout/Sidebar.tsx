import { useEffect, useState } from "react";
import { Plus, LayoutDashboard, Settings, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/stores/projectStore";
import { useNavigationStore } from "@/stores/navigationStore";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { useAddProject } from "@/hooks/useAddProject";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function Sidebar() {
  const projects = useProjectStore((s) => s.projects);
  const selectedProject = useProjectStore((s) => s.selectedProject);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const selectProject = useProjectStore((s) => s.selectProject);
  const removeProject = useProjectStore((s) => s.removeProject);
  const currentView = useNavigationStore((s) => s.currentView);
  const navigate = useNavigationStore((s) => s.navigate);
  const handleAddProject = useAddProject();

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleSelectProject = (projectId: string) => {
    selectProject(projectId);
    navigate("project");
  };

  const handleRemoveProject = async (projectId: string) => {
    await removeProject(projectId);
    if (selectedProject?.id === projectId) {
      navigate("dashboard");
    }
    setConfirmRemove(null);
  };

  const navItems = [
    { view: "dashboard" as const, icon: LayoutDashboard, label: "Dashboard" },
    { view: "settings" as const, icon: Settings, label: "Settings" },
  ];

  return (
    <aside
      className="theme-transition relative flex h-full w-72 flex-col"
      style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}
    >
      {/* Gradient accent on right edge */}
      <div
        className="absolute top-0 right-0 bottom-0 w-px"
        style={{
          background:
            "linear-gradient(to bottom, var(--primary-ring), transparent, var(--primary-ring))",
          opacity: 0.6,
        }}
      />

      {/* App logo */}
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <h1 className="text-sm font-bold tracking-wide" style={{ color: "var(--primary)" }}>
          ContextBridge
        </h1>
        <button
          type="button"
          onClick={handleAddProject}
          className="rounded-md p-1.5 transition-all duration-150 hover:scale-105 active:scale-95"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
          }}
          aria-label="Add project"
        >
          <Plus size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {projects.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            No projects yet
          </p>
        ) : (
          <ul className="space-y-1">
            {projects.map((project) => (
              <li key={project.id} className="group relative">
                <ProjectCard
                  project={project}
                  isSelected={selectedProject?.id === project.id && currentView === "project"}
                  onSelect={() => handleSelectProject(project.id)}
                />
                <AnimatePresence>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmRemove(project.id);
                    }}
                    className="absolute top-2.5 right-2 hidden rounded-md p-1 transition-colors group-hover:block"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                      (e.currentTarget as HTMLElement).style.color = "#f87171";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    }}
                    aria-label={`Remove project ${project.name}`}
                  >
                    <Trash2 size={12} />
                  </motion.button>
                </AnimatePresence>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="p-2" style={{ borderTop: "1px solid var(--border)" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => navigate(item.view)}
              className={clsx(
                "relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-150",
              )}
              style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
              aria-label={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: "var(--bg-active)",
                    boxShadow: `inset 0 0 0 1px var(--border-active)`,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={16} className="relative z-10" />
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remove Project"
        message="Remove this project from ContextBridge? This won't delete any files."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => confirmRemove && void handleRemoveProject(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />
    </aside>
  );
}
