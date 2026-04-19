import { useNavigationStore } from "@/stores/navigationStore";
import { Dashboard } from "@/pages/Dashboard";
import { ProjectDetail } from "@/pages/ProjectDetail";
import { Settings } from "@/pages/Settings";

export function MainContent() {
  const currentView = useNavigationStore((s) => s.currentView);

  switch (currentView) {
    case "dashboard":
      return <Dashboard />;
    case "project":
      return <ProjectDetail />;
    case "settings":
      return <Settings />;
  }
}
