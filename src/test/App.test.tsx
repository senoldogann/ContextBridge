import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { App } from "../App";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByText("ContextBridge")).toBeInTheDocument();
  });

  it("shows empty state when no project is selected", () => {
    render(<App />);
    expect(screen.getByText("No project selected")).toBeInTheDocument();
  });
});
