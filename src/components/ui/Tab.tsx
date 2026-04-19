import { useState } from "react";
import { clsx } from "clsx";
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
      <div className="relative flex gap-1 border-b border-zinc-800" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-400"
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
