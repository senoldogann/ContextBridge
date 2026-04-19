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
    <aside className="relative flex h-full w-72 flex-col border-r border-zinc-800/50 bg-zinc-900/80 backdrop-blur-xl">
      {/* Gradient border effect on right edge */}
      <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/20 via-zinc-800/50 to-indigo-500/20" />

      {/* Drag region */}
      <div data-tauri-drag-region className="h-8 shrink-0" />

      {/* App logo */}
      <div className="flex items-center justify-between px-4 pb-3">
        <h1 className="bg-gradient-to-r from-indigo-400 to-indigo-300 bg-clip-text text-sm font-bold tracking-wide text-transparent">
          ContextBridge
        </h1>
        <button
          type="button"
          onClick={handleAddProject}
          className={clsx(
            "rounded-md p-1.5 text-zinc-400 transition-all duration-150",
            "hover:scale-105 hover:bg-zinc-800 hover:text-zinc-200",
            "active:scale-95",
          )}
          aria-label="Add project"
        >
          <Plus size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
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
                <AnimatePresence>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmRemove(project.id);
                    }}
                    className="absolute top-2.5 right-2 hidden rounded-md p-1 text-zinc-600 transition-colors group-hover:block hover:bg-zinc-700 hover:text-red-400"
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

      <div className="border-t border-zinc-800/50 p-2">
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
                isActive
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
              )}
              aria-label={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg bg-indigo-600/10 ring-1 ring-indigo-500/20"
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
