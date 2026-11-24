import "@fontsource-variable/inter";
import "@fontsource-variable/inter-tight";
import "@fontsource/ibm-plex-mono/400.css";
import "./i18n";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/admin.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}service-worker.js`)
      .catch((error: unknown) => {
        console.error(
          "Staff portal service worker registration failed.",
          error,
        );
      });
  });
}
