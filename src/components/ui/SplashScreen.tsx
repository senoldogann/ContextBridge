import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BridgeIcon } from "@/components/ui/BridgeIcon";

interface SplashScreenProps {
  onComplete: () => void;
}

const TAGLINES = [
  "Sync context across every AI tool",
  "One source of truth, every assistant",
  "Your projects, always in context",
];

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [taglineIndex] = useState(() => Math.floor(Math.random() * TAGLINES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const duration = 2200;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setProgress(Math.min((step / steps) * 100, 100));
      if (step >= steps) {
        clearInterval(timer);
        setTimeout(() => {
          setVisible(false);
          setTimeout(onComplete, 500);
        }, 200);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "var(--bg-base)" }}
        >
          {/* Ambient glow blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.15, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-600 blur-[100px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.08, scale: 1 }}
              transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
              className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-violet-600 blur-[80px]"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.06 }}
              transition={{ duration: 2, delay: 0.5 }}
              className="absolute right-1/4 -bottom-16 h-48 w-48 rounded-full bg-teal-400 blur-[60px]"
            />
          </div>

          {/* Main content */}
          <div className="relative flex flex-col items-center gap-8">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="animate-float"
            >
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 shadow-2xl ring-1 shadow-emerald-500/40 ring-white/10">
                <BridgeIcon className="h-12 w-12 text-white" />
                {/* Inner glow */}
                <div className="absolute inset-0 rounded-3xl bg-white/5" />
              </div>
            </motion.div>

            {/* Name */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-2"
            >
              <h1 className="bg-gradient-to-r from-emerald-300 via-white to-cyan-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
                ContextBridge
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.55 }}
                className="text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                {TAGLINES[taglineIndex]}
              </motion.p>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="w-48"
            >
              <div
                className="h-px w-full overflow-hidden rounded-full"
                style={{ background: "var(--border-strong)" }}
              >
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-1 w-1 rounded-full bg-emerald-500"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Version */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.4 }}
              className="absolute -bottom-12 text-[10px] tracking-widest uppercase"
              style={{ color: "var(--text-muted)", opacity: 0.5 }}
            >
              v0.1.0
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
