import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainContent } from "@/components/layout/MainContent";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UpdateChecker } from "@/components/ui/UpdateChecker";
import { TitleBar } from "@/components/ui/TitleBar";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { OnboardingGuide } from "@/components/ui/OnboardingGuide";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { Toaster } from "sonner";
import type { FileChangeEvent } from "@/types";

const MAX_CONCURRENT_REFRESHES = 2;

function ErrorBanner() {
  const error = useProjectStore((s) => s.error);
  const clearError = () => useProjectStore.setState({ error: null });

  if (!error) return null;

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm backdrop-blur-sm"
      style={{
        background: "var(--alert-error-bg)",
        color: "var(--alert-error-text)",
        borderBottom: "1px solid var(--alert-error-border)",
      }}
    >
      <span>{error}</span>
      <button
        type="button"
        onClick={clearError}
        className="ml-4 shrink-0 rounded px-2 py-0.5 text-xs transition-colors"
        style={{ color: "var(--alert-error-text)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--alert-error-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

export function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const theme = useSettingsStore((s) => s.theme);
  const autoSync = useSettingsStore((s) => s.autoSync);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const refreshProject = useProjectStore((s) => s.refreshProject);
  const partialRefreshProject = useProjectStore((s) => s.partialRefreshProject);
  const syncingProjectsRef = useRef<Set<string>>(new Set());
  const queuedProjectsRef = useRef<Set<string>>(new Set());
  const refreshTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Maps projectId -> accumulated changed_paths for partial refresh batching
  const pendingPathsRef = useRef<Map<string, string[]>>(new Map());

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let disposed = false;
    const refreshTimers = refreshTimersRef.current;
    const queuedProjects = queuedProjectsRef.current;
    const syncingProjects = syncingProjectsRef.current;
    const queuedForExecution = new Set<string>();
    const refreshQueue: string[] = [];
    let activeRefreshCount = 0;

    const drainRefreshQueue = (): void => {
      if (disposed) {
        return;
      }

      while (activeRefreshCount < MAX_CONCURRENT_REFRESHES) {
        const projectId = refreshQueue.shift();
        if (!projectId) {
          return;
        }

        queuedForExecution.delete(projectId);

        if (syncingProjects.has(projectId)) {
          queuedProjects.add(projectId);
          continue;
        }

        activeRefreshCount += 1;
        syncingProjects.add(projectId);
        const changedPaths = pendingPathsRef.current.get(projectId) ?? [];
        pendingPathsRef.current.delete(projectId);

        const refreshFn =
          changedPaths.length > 0
            ? () => partialRefreshProject(projectId, changedPaths)
            : () => refreshProject(projectId);

        void refreshFn().finally(() => {
          if (disposed) {
            return;
          }

          activeRefreshCount -= 1;
          syncingProjects.delete(projectId);

          if (queuedProjects.delete(projectId)) {
            scheduleRefresh(projectId, []);
          }

          drainRefreshQueue();
        });
      }
    };

    const queueRefresh = (projectId: string): void => {
      if (disposed || queuedForExecution.has(projectId)) {
        return;
      }

      queuedForExecution.add(projectId);
      refreshQueue.push(projectId);
      drainRefreshQueue();
    };

    const scheduleRefresh = (projectId: string, changedPaths: string[]): void => {
      if (disposed) {
        return;
      }

      // Accumulate changed paths for batching
      const existing = pendingPathsRef.current.get(projectId) ?? [];
      pendingPathsRef.current.set(projectId, [...existing, ...changedPaths]);

      const existingTimer = refreshTimers.get(projectId);
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
      }

      const timerId = window.setTimeout(() => {
        if (disposed) {
          return;
        }

        refreshTimers.delete(projectId);

        if (syncingProjects.has(projectId)) {
          queuedProjects.add(projectId);
          return;
        }

        queueRefresh(projectId);
      }, 300);

      refreshTimers.set(projectId, timerId);
    };

    void listen<FileChangeEvent>("file-change", async (event) => {
      if (!autoSync) {
        return;
      }

      const { project_id: projectId, changed_paths: changedPaths } = event.payload;
      scheduleRefresh(projectId, changedPaths ?? []);
    })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }

        unlisten = cleanup;
      })
      .catch((error: unknown) => {
        console.error("Failed to subscribe to file-change events", error);
      });

    return () => {
      disposed = true;
      for (const timerId of refreshTimers.values()) {
        window.clearTimeout(timerId);
      }
      refreshTimers.clear();
      queuedProjects.clear();
      syncingProjects.clear();
      if (unlisten) {
        unlisten();
      }
    };
  }, [autoSync, refreshProject, partialRefreshProject]);

  // Listen for OS color scheme changes when using "system" theme
  useEffect(() => {
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // Re-apply DOM classes when OS preference changes
      const isDark = mq.matches;
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [theme]);

  const toasterTheme =
    theme === "light"
      ? ("light" as const)
      : theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? ("dark" as const)
          : ("light" as const)
        : ("dark" as const);

  const toasterOptions = {
    style: {
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      color: "var(--text-primary)",
    },
    classNames: {
      description: "text-[color:var(--text-secondary)]",
      success: "cb-toast-success",
      error: "cb-toast-error",
    },
  };

  const handleSplashDone = () => {
    setSplashDone(true);
    const onboardingDone = localStorage.getItem("cb:onboarding-done");
    if (!onboardingDone) setShowOnboarding(true);
  };

  const handleShowGuide = () => {
    setShowOnboarding(true);
  };

  return (
    <div
      className="app-shell theme-transition relative flex flex-1 flex-col overflow-hidden"
      style={{
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        borderRadius: "12px",
      }}
    >
      <AnimatePresence>
        {!splashDone && <SplashScreen key="splash" onComplete={handleSplashDone} />}
      </AnimatePresence>

      <AnimatePresence>
        {splashDone && showOnboarding && (
          <OnboardingGuide key="onboarding" onClose={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>

      {splashDone && (
        <>
          <TitleBar onShowGuide={handleShowGuide} />
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            <motion.div
              animate={{ width: sidebarOpen ? 288 : 52 }}
              initial={false}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="shrink-0 overflow-hidden"
            >
              <Sidebar collapsed={!sidebarOpen} />
            </motion.div>
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <UpdateChecker />
              <ErrorBanner />
              <ErrorBoundary>
                <MainContent />
              </ErrorBoundary>
            </div>
          </div>
        </>
      )}

      <Toaster
        theme={toasterTheme}
        richColors={false}
        position="top-right"
        toastOptions={toasterOptions}
      />
    </div>
  );
}
