import { describe, it, expect, beforeEach } from "vitest";
import { useNavigationStore } from "@/stores/navigationStore";

describe("navigationStore", () => {
  beforeEach(() => {
    useNavigationStore.setState({ currentView: "dashboard" });
  });

  it("has 'dashboard' as the default view", () => {
    expect(useNavigationStore.getState().currentView).toBe("dashboard");
  });

  it("navigate() changes the current view", () => {
    useNavigationStore.getState().navigate("settings");
    expect(useNavigationStore.getState().currentView).toBe("settings");

    useNavigationStore.getState().navigate("project");
    expect(useNavigationStore.getState().currentView).toBe("project");
  });

  it("navigating to the same view is a no-op (no error)", () => {
    useNavigationStore.getState().navigate("dashboard");
    expect(useNavigationStore.getState().currentView).toBe("dashboard");

    useNavigationStore.getState().navigate("dashboard");
    expect(useNavigationStore.getState().currentView).toBe("dashboard");
  });
});
