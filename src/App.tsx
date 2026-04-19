import { useState, useEffect } from "react";
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

function ErrorBanner() {
  const error = useProjectStore((s) => s.error);
  const clearError = () => useProjectStore.setState({ error: null });

  if (!error) return null;

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm backdrop-blur-sm"
      style={{ background: "rgba(220,38,38,0.15)", color: "#fca5a5" }}
    >
      <span>{error}</span>
      <button
        type="button"
        onClick={clearError}
        className="ml-4 shrink-0 rounded px-2 py-0.5 text-xs transition-colors"
        style={{ color: "#fca5a5" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.2)";
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
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const toasterTheme = theme === "light" ? "light" : "dark";

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
      className="theme-transition relative flex h-screen flex-col overflow-hidden rounded-lg"
      style={{
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-strong)",
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
          <div className="relative flex flex-1 overflow-hidden">
            <AnimatePresence initial={false}>
              {sidebarOpen && (
                <motion.div
                  key="sidebar"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 288, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="shrink-0 overflow-hidden"
                >
                  <Sidebar />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="relative flex flex-1 flex-col overflow-hidden">
              <UpdateChecker />
              <ErrorBanner />
              <ErrorBoundary>
                <MainContent />
              </ErrorBoundary>
            </div>
          </div>
        </>
      )}

      <Toaster theme={toasterTheme} richColors position="top-right" />
    </div>
  );
}
