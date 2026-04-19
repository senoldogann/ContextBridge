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
      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150"
      style={
        isSelected
          ? {
              background: "var(--bg-active)",
              color: "var(--text-primary)",
              boxShadow: `inset 0 0 0 1px var(--border-active)`,
            }
          : { color: "var(--text-secondary)" }
      }
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <Folder
        size={16}
        className="mt-0.5 shrink-0"
        style={{ color: isSelected ? "var(--primary)" : "var(--text-muted)" }}
      />
      <div className="min-w-0 flex-1">
        <p className={clsx("truncate text-sm font-medium")}>{project.name}</p>
        <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
          {project.root_path}
        </p>
        <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
          Updated {new Date(project.updated_at).toLocaleDateString()}
        </p>
      </div>
    </motion.button>
  );
}
