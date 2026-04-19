import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/globals.css";

// Apply saved theme before first paint to prevent flash
const savedTheme = localStorage.getItem("cb:theme") ?? "dark";
document.documentElement.classList.toggle("light", savedTheme === "light");
document.documentElement.classList.toggle("dark", savedTheme !== "light");

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
