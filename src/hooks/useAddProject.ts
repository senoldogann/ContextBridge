import { open } from "@tauri-apps/plugin-dialog";
import { useNavigationStore } from "@/stores/navigationStore";
import { useProjectStore } from "@/stores/projectStore";

export function useAddProject() {
  const addProject = useProjectStore((s) => s.addProject);
  const navigate = useNavigationStore((s) => s.navigate);

  return async () => {
    const selected = await open({ directory: true, title: "Select Project Folder" });
    if (selected) {
      const name = selected.split(/[\\/]/).pop() || "Untitled";
      const project = await addProject(name, selected);
      if (project) {
        navigate("project");
      }
    }
  };
}
