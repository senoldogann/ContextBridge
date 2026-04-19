import { clsx } from "clsx";
import { Folder } from "lucide-react";
import { motion } from "framer-motion";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  onSelect: () => void;
}

export function ProjectCard({ project, isSelected, onSelect }: ProjectCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.15 }}
      className={clsx(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150",
        isSelected
          ? "bg-indigo-600/15 text-zinc-100 ring-1 ring-indigo-500/20"
          : "text-zinc-400 hover:bg-zinc-800/80",
      )}
    >
      <Folder
        size={16}
        className={clsx("mt-0.5 shrink-0", isSelected ? "text-indigo-400" : "text-zinc-500")}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{project.name}</p>
        <p className="truncate text-xs text-zinc-500">{project.root_path}</p>
        <p className="mt-1 text-[10px] text-zinc-600">
          Updated {new Date(project.updated_at).toLocaleDateString()}
        </p>
      </div>
    </motion.button>
  );
}
