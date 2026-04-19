import { Sidebar } from "@/components/layout/Sidebar";
import { MainContent } from "@/components/layout/MainContent";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UpdateChecker } from "@/components/ui/UpdateChecker";
import { useProjectStore } from "@/stores/projectStore";

function ErrorBanner() {
  const error = useProjectStore((s) => s.error);
  const clearError = () => useProjectStore.setState({ error: null });

  if (!error) return null;

  return (
    <div className="flex items-center justify-between bg-red-900/50 px-4 py-2 text-sm text-red-200">
      <span>{error}</span>
      <button
        type="button"
        onClick={clearError}
        className="ml-4 shrink-0 rounded px-2 py-0.5 text-xs text-red-300 hover:bg-red-800"
      >
        Dismiss
      </button>
    </div>
  );
}

export function App() {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <UpdateChecker />
        <ErrorBanner />
        <ErrorBoundary>
          <MainContent />
        </ErrorBoundary>
      </div>
    </div>
  );
}
