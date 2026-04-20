import { FolderOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useAddProject } from "@/hooks/useAddProject";
import { useProjectStore } from "@/stores/projectStore";

export function EmptyState() {
  const handleAdd = useAddProject();
  const isAddingProject = useProjectStore((s) => s.isAddingProject);

  return (
    <main className="flex flex-1 items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="rounded-full p-5"
          style={{
            background: "var(--primary-muted)",
            boxShadow: `0 4px 24px var(--primary-ring), inset 0 0 0 1px var(--primary-ring)`,
          }}
        >
          <FolderOpen size={32} style={{ color: "var(--primary)" }} />
        </motion.div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {isAddingProject ? "Preparing your project" : "No projects yet"}
          </h2>
          <p className="mt-1 max-w-xs text-sm" style={{ color: "var(--text-muted)" }}>
            {isAddingProject
              ? "Scanning files and generating initial AI-ready context files."
              : "Add your first project to start generating AI-ready context files."}
          </p>
        </div>
        <Button onClick={handleAdd} aria-label="Add your first project" loading={isAddingProject}>
          {isAddingProject ? "Indexing project..." : "Add Project"}
        </Button>
      </motion.div>
    </main>
  );
}
