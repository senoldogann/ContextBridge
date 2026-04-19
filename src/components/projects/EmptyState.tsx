import { FolderOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useAddProject } from "@/hooks/useAddProject";

export function EmptyState() {
  const handleAdd = useAddProject();

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
          className="rounded-full bg-gradient-to-br from-indigo-600/20 to-indigo-500/10 p-5 shadow-lg ring-1 shadow-indigo-500/10 ring-indigo-500/20"
        >
          <FolderOpen size={32} className="text-indigo-400" />
        </motion.div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-200">No projects yet</h2>
          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            Add your first project to start generating AI-ready context files.
          </p>
        </div>
        <Button onClick={handleAdd} aria-label="Add your first project">
          Add Project
        </Button>
      </motion.div>
    </main>
  );
}
