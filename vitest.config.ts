import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/test/**", "src/**/*.d.ts"],
        thresholds: {
          lines: 40,
          branches: 40,
          functions: 40,
          statements: 40,
        },
      },
    },
  }),
);
