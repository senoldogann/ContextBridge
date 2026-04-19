import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Toggle } from "@/components/ui/Toggle";

describe("Toggle", () => {
  it("renders in unchecked state", () => {
    render(<Toggle checked={false} onChange={() => {}} label="Test toggle" />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("renders in checked state", () => {
    render(<Toggle checked={true} onChange={() => {}} label="Test toggle" />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange with negated value on click", () => {
    const handleChange = vi.fn();
    render(<Toggle checked={false} onChange={handleChange} label="Test toggle" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("calls onChange with false when unchecking", () => {
    const handleChange = vi.fn();
    render(<Toggle checked={true} onChange={handleChange} label="Test toggle" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it("renders a visible label text", () => {
    render(<Toggle checked={false} onChange={() => {}} label="Auto-sync" />);
    expect(screen.getByText("Auto-sync")).toBeInTheDocument();
  });

  it("does not render label text when label is omitted", () => {
    const { container } = render(<Toggle checked={false} onChange={() => {}} />);
    const spans = container.querySelectorAll("span.text-sm");
    expect(spans).toHaveLength(0);
  });

  it("is disabled when disabled prop is true", () => {
    render(<Toggle checked={false} onChange={() => {}} disabled label="Disabled" />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
