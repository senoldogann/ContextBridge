import { useNavigationStore } from "@/stores/navigationStore";
import { Dashboard } from "@/pages/Dashboard";
import { ProjectDetail } from "@/pages/ProjectDetail";
import { Settings } from "@/pages/Settings";
import { AnimatePresence, motion } from "framer-motion";

export function MainContent() {
  const currentView = useNavigationStore((s) => s.currentView);

  let content: React.ReactNode;
  switch (currentView) {
    case "dashboard":
      content = <Dashboard />;
      break;
    case "project":
      content = <ProjectDetail />;
      break;
    case "settings":
      content = <Settings />;
      break;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}
