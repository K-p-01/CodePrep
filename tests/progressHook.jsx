import { act } from "react";
import { createRoot } from "react-dom/client";
import { useProgress } from "../src/state/progressStore.js";

export function renderProgressHook() {
  let current;
  function Probe() {
    current = useProgress();
    return null;
  }
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<Probe />));
  return {
    get current() { return current; },
    act,
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}
