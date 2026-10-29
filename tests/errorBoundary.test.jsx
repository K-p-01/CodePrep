import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppErrorBoundary from "../src/components/layout/AppErrorBoundary.jsx";

let root;
let container;

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  container?.remove();
  container = null;
});

describe("application error boundary", () => {
  it("shows an announced recovery screen and can render again after recovery", () => {
    let shouldThrow = true;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    function SometimesBroken() {
      if (shouldThrow) throw new Error("test render failure");
      return <p>Recovered page</p>;
    }
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<AppErrorBoundary><SometimesBroken /></AppErrorBoundary>));
    expect(container.querySelector('[role="alert"] h1')?.textContent).toContain("could not show this page");
    expect(container.querySelector('a[href="/"]')?.textContent).toContain("Return to dashboard");
    expect(consoleError).toHaveBeenCalled();

    shouldThrow = false;
    act(() => container.querySelector("button").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.textContent).toContain("Recovered page");
  });
});
