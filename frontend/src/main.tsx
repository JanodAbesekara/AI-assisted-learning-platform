import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const stored = localStorage.getItem("selflearn-theme");
let initialTheme: "dark" | "light" = "dark";
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (parsed?.state?.theme === "light" || parsed?.state?.theme === "dark") {
      initialTheme = parsed.state.theme;
    }
  } catch {
    /* use default */
  }
}
document.documentElement.setAttribute("data-theme", initialTheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
