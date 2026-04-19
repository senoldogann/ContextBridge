import { open } from "@tauri-apps/plugin-dialog";
import { useProjectStore } from "@/stores/projectStore";

export function useAddProject() {
  const addProject = useProjectStore((s) => s.addProject);

  return async () => {
    const selected = await open({ directory: true, title: "Select Project Folder" });
    if (selected) {
      const name = selected.split(/[\\/]/).pop() || "Untitled";
      await addProject(name, selected);
    }
  };
}
