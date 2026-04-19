import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabGroupProps {
  tabs: TabItem[];
  defaultTab?: string;
}

export function TabGroup({ tabs, defaultTab }: TabGroupProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div>
      <div
        className="relative flex gap-1"
        style={{ borderBottom: "1px solid var(--border)" }}
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className="relative px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ color: activeTab === tab.id ? "var(--primary)" : "var(--text-muted)" }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-x-0 -bottom-px h-0.5"
                style={{ background: "var(--accent-gradient)" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="pt-4"
          role="tabpanel"
          id={`panel-${activeTab}`}
        >
          {activeContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
