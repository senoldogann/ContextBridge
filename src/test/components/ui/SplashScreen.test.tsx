import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SplashScreen } from "@/components/ui/SplashScreen";

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn().mockResolvedValue("0.1.0"),
}));

describe("SplashScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses the latest completion callback without restarting the animation", async () => {
    const initialOnComplete = vi.fn();
    const latestOnComplete = vi.fn();

    const { rerender } = render(<SplashScreen onComplete={initialOnComplete} />);

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      vi.advanceTimersByTime(2200);
    });
    rerender(<SplashScreen onComplete={latestOnComplete} />);
    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(initialOnComplete).not.toHaveBeenCalled();
    expect(latestOnComplete).toHaveBeenCalledTimes(1);
  });
});
