import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Zap, Bot, ArrowRight, CheckCircle2, X } from "lucide-react";
import { BridgeIcon } from "@/components/ui/BridgeIcon";

interface OnboardingGuideProps {
  onClose: () => void;
}

interface Step {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  visual: React.ReactNode;
}

const steps: Step[] = [
  {
    icon: <BridgeIcon className="h-6 w-6" />,
    title: "Welcome to ContextBridge",
    subtitle: "Your AI context hub",
    description:
      "ContextBridge keeps all your AI coding tools in sync. Add a project once and every assistant — Claude, Cursor, Copilot, Codex — gets the same rich context automatically.",
    visual: (
      <div className="relative flex h-36 items-center justify-center">
        {/* Center hub */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-xl ring-1 shadow-emerald-500/30 ring-white/10"
        >
          <BridgeIcon className="h-7 w-7 text-white" />
        </motion.div>

        {/* Orbiting tool icons */}
        {["Claude", "Cursor", "Copilot", "Codex"].map((tool, i) => {
          const angle = (i / 4) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const r = 52;
          const x = r * Math.cos(rad);
          const y = r * Math.sin(rad);
          return (
            <motion.div
              key={tool}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.12, type: "spring", stiffness: 300 }}
              className="absolute flex flex-col items-center gap-1"
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <div className="light:bg-zinc-200/90 light:text-emerald-600 light:ring-zinc-300/50 flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800/90 text-[9px] font-bold text-emerald-300 ring-1 ring-zinc-700/50 dark:bg-zinc-800/90">
                {tool.slice(0, 2)}
              </div>
            </motion.div>
          );
        })}

        {/* Connection lines */}
        <svg
          className="pointer-events-none absolute inset-0"
          viewBox="0 0 200 144"
          style={{ opacity: 0.2 }}
        >
          {["M100,72 L148,20", "M100,72 L152,72", "M100,72 L148,124", "M100,72 L52,72"].map(
            (d, i) => (
              <motion.path
                key={i}
                d={d}
                stroke="#6366f1"
                strokeWidth="1"
                fill="none"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
              />
            ),
          )}
        </svg>
      </div>
    ),
  },
  {
    icon: <FolderOpen className="h-6 w-6" />,
    title: "Add Your Project",
    subtitle: "Step 1",
    description:
      'Click the + button in the sidebar or press the "Add Project" button. Select your project folder. ContextBridge scans your codebase to understand its structure, tech stack, and dependencies.',
    visual: (
      <div className="flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xs rounded-xl border p-4 shadow-lg"
          style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="ml-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
              Add Project
            </span>
          </div>
          <div
            className="rounded-lg border-2 border-dashed p-4 text-center"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <FolderOpen className="mx-auto mb-1 h-6 w-6 text-emerald-400" />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Select project folder
            </p>
          </div>
          <motion.div
            className="mt-2 flex items-center gap-1.5 text-[10px] text-green-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <CheckCircle2 size={10} />
            <span>Scanning tech stack…</span>
          </motion.div>
        </motion.div>
      </div>
    ),
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Sync to AI Tools",
    subtitle: "Step 2",
    description:
      'Open a project and click "Sync All" — ContextBridge writes context files (CLAUDE.md, .cursor/rules, AGENTS.md, .github/copilot-instructions.md) so every tool instantly understands your project.',
    visual: (
      <div className="space-y-2">
        {[
          { tool: "Claude Code", file: "CLAUDE.md", color: "text-orange-400", delay: 0 },
          { tool: "Cursor", file: ".cursor/rules/", color: "text-blue-400", delay: 0.1 },
          {
            tool: "GitHub Copilot",
            file: "copilot-instructions.md",
            color: "text-emerald-400",
            delay: 0.2,
          },
          { tool: "Codex", file: "AGENTS.md", color: "text-violet-400", delay: 0.3 },
        ].map(({ tool, file, color, delay }) => (
          <motion.div
            key={tool}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + delay, duration: 0.35 }}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <span className={`font-medium ${color}`}>{tool}</span>
            <div className="flex items-center gap-1.5">
              <span style={{ color: "var(--text-muted)" }}>{file}</span>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7 + delay, type: "spring" }}
              >
                <CheckCircle2 size={12} className="text-green-400" />
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    icon: <Bot className="h-6 w-6" />,
    title: "Work with AI",
    subtitle: "You're ready!",
    description:
      "Open any AI tool and it already knows your project. Ask complex questions, get contextually accurate suggestions, and never repeat yourself. ContextBridge keeps everything in sync automatically.",
    visual: (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <div
          className="rounded-xl p-3 text-xs leading-relaxed"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          <span className="font-semibold text-emerald-400">You → Claude:</span>
          <span style={{ color: "var(--text-secondary)" }}>
            {" "}
            "Refactor the auth module to use JWT"
          </span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl p-3 text-xs leading-relaxed"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}
        >
          <span className="font-semibold text-green-400">Claude:</span>
          <span style={{ color: "var(--text-secondary)" }}>
            {" "}
            "Sure! I see you're using Express with TypeScript. I'll update{" "}
            <code className="text-emerald-300">src/auth/middleware.ts</code> to use{" "}
            <code className="text-emerald-300">jsonwebtoken</code>…"
          </span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-[10px]"
          style={{ color: "var(--text-muted)" }}
        >
          Claude knows your stack because ContextBridge told it ✓
        </motion.p>
      </motion.div>
    ),
  },
];

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -32 : 32 }),
};

export function OnboardingGuide({ onClose }: OnboardingGuideProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  if (!step) return null;

  const goNext = () => {
    if (isLast) {
      localStorage.setItem("cb:onboarding-done", "true");
      onClose();
      return;
    }
    setDirection(1);
    setStepIndex((i) => i + 1);
  };

  const goPrev = () => {
    setDirection(-1);
    setStepIndex((i) => i - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-8"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-strong)",
        }}
      >
        {/* Header gradient strip */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600" />

        {/* Close */}
        <button
          type="button"
          aria-label="Skip onboarding"
          onClick={() => {
            localStorage.setItem("cb:onboarding-done", "true");
            onClose();
          }}
          className="absolute top-4 right-4 rounded-full p-1 opacity-40 transition-opacity hover:opacity-100"
          style={{ color: "var(--text-muted)" }}
        >
          <X size={16} />
        </button>

        {/* Step content */}
        <div className="p-8">
          {/* Step indicator */}
          <div className="mb-6 flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i === stepIndex ? "w-6 bg-emerald-500" : "w-3"}`}
                style={{ background: i === stepIndex ? "#6366f1" : "var(--border-strong)" }}
              />
            ))}
          </div>

          {/* Animated visual area */}
          <div className="mb-6 min-h-[144px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={stepIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: "easeInOut" }}
              >
                {step.visual}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Text */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`text-${stepIndex}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeInOut" }}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  {step.subtitle}
                </span>
              </div>
              <h2 className="mb-2 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                {step.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              disabled={stepIndex === 0}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-0"
              style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
            >
              Back
            </button>
            <motion.button
              type="button"
              onClick={goNext}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40"
            >
              {isLast ? (
                <>
                  <CheckCircle2 size={14} />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight size={14} />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
