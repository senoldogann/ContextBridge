import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainContent } from "@/components/layout/MainContent";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UpdateChecker } from "@/components/ui/UpdateChecker";
import { TitleBar } from "@/components/ui/TitleBar";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { OnboardingGuide } from "@/components/ui/OnboardingGuide";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Toaster } from "sonner";

function ErrorBanner() {
  const error = useProjectStore((s) => s.error);
  const clearError = () => useProjectStore.setState({ error: null });

  if (!error) return null;

  return (
    <div className="flex items-center justify-between bg-red-900/50 px-4 py-2 text-sm text-red-200 backdrop-blur-sm">
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
  const [splashDone, setSplashDone] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const theme = useSettingsStore((s) => s.theme);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const toasterTheme = theme === "light" ? "light" : "dark";

  const handleSplashDone = () => {
    setSplashDone(true);
    const onboardingDone = localStorage.getItem("cb:onboarding-done");
    if (!onboardingDone) setShowOnboarding(true);
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-950/10 via-transparent to-transparent" />

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
          <TitleBar />
          <div className="relative flex flex-1 overflow-hidden">
            <Sidebar />
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
