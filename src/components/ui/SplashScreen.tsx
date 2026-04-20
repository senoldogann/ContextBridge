import { useEffect, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
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
  const [version, setVersion] = useState("");
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    let isMounted = true;

    void getVersion()
      .then((value) => {
        if (isMounted) {
          setVersion(value);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load app version", { error });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const duration = 2200;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    let hideTimerId: number | undefined;
    let completeTimerId: number | undefined;

    const progressTimerId = window.setInterval(() => {
      step++;
      setProgress(Math.min((step / steps) * 100, 100));
      if (step >= steps) {
        window.clearInterval(progressTimerId);
        hideTimerId = window.setTimeout(() => {
          setVisible(false);
          completeTimerId = window.setTimeout(() => {
            onCompleteRef.current();
          }, 500);
        }, 200);
      }
    }, interval);

    return () => {
      window.clearInterval(progressTimerId);
      if (hideTimerId !== undefined) {
        window.clearTimeout(hideTimerId);
      }
      if (completeTimerId !== undefined) {
        window.clearTimeout(completeTimerId);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "var(--bg-base)", borderRadius: "12px" }}
        >
          {/* Ambient glow blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.08, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-[100px]"
              style={{ background: "var(--primary)" }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.05, scale: 1 }}
              transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
              className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full blur-[80px]"
              style={{ background: "var(--primary)" }}
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
              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-3xl shadow-2xl"
                style={{
                  background: "var(--bg-elevated)",
                  boxShadow: "var(--shadow-hover)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="relative z-10" style={{ color: "var(--text-primary)" }}>
                  <BridgeIcon className="h-12 w-12" />
                </div>
                <div
                  className="absolute inset-0 rounded-3xl"
                  style={{ background: "var(--primary-muted)" }}
                />
              </div>
            </motion.div>

            {/* Name */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-2"
            >
              <h1
                className="text-4xl font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Context Bridge
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
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, background: "var(--primary)" }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-1 w-1 rounded-full"
                    style={{ background: "var(--primary)" }}
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
              {version ? `v${version}` : ""}
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
