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

createRoot(document.getElementById("root")!).render(<App />);
