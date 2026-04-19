import { Sidebar } from "@/components/layout/Sidebar";
import { MainContent } from "@/components/layout/MainContent";
import { useProjectStore } from "@/stores/projectStore";

export function App() {
  const selectedProject = useProjectStore((s) => s.selectedProject);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <MainContent project={selectedProject} />
    </div>
  );
}
