import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import { StoreProvider } from "./state/store";
import { App } from "./App";

const CANVAS_W = 1440;
const CANVAS_H = 1026;

// Fit the 1440 x 1026 design canvas to the window width (never upscale), and let it
// grow taller when the window is taller so there's no empty band at the bottom.
function fitCanvas() {
  const root = document.documentElement;
  const scale = Math.min(1, root.clientWidth / CANVAS_W);
  root.style.setProperty("--ui-scale", String(scale));
  root.style.setProperty("--canvas-h", `${Math.max(CANVAS_H, Math.floor(window.innerHeight / scale))}px`);
}
fitCanvas();
window.addEventListener("resize", fitCanvas);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
