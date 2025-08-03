import React from "react";
import { render } from "@testing-library/react";
import App from "../App";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

describe("App Accessibility and Responsiveness", () => {
  it("has no aXe accessibility violations", async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders mobile view responsively", () => {
    global.innerWidth = 375;
    global.dispatchEvent(new Event("resize"));
    const { container } = render(<App />);
    expect(container.firstChild).toHaveClass("App");
    // Check theme toggle scaling for mobile
    const themeToggle = container.querySelector(".theme-toggle");
    expect(themeToggle).toBeInTheDocument();
    expect(themeToggle).toHaveStyle("font-size: 12px");
  });

  it("renders for desktop screens", () => {
    global.innerWidth = 1024;
    global.dispatchEvent(new Event("resize"));
    const { container } = render(<App />);
    expect(container.firstChild).toHaveClass("App");
    const themeToggle = container.querySelector(".theme-toggle");
    expect(themeToggle).toBeInTheDocument();
    expect(themeToggle).toHaveStyle("font-size: 14px");
  });
});
