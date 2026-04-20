import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OnboardingGuide } from "@/components/ui/OnboardingGuide";

describe("OnboardingGuide", () => {
  it("uses a theme-aware color for the center hub icon on the first step", () => {
    render(<OnboardingGuide onClose={() => {}} />);

    expect(screen.getByText("Welcome to Context Bridge")).toBeInTheDocument();

    const centerHub = screen.getByTestId("onboarding-center-hub");
    const centerHubIcon = centerHub.querySelector("svg");

    expect(centerHub).toHaveStyle({ color: "var(--primary)" });
    expect(centerHubIcon).not.toHaveClass("text-white");
  });
});
