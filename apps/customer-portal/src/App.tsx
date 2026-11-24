import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { ConnectionRestoredPage } from "./pages/ConnectionRestoredPage";
import { OfflinePage } from "./pages/OfflinePage";
import { appRoutes } from "./routes/appRoutes";
import { restoreSession } from "./services/sessionManager";

const router = createBrowserRouter(appRoutes);

export function App() {
  const [started, setStarted] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "connected" | "offline" | "restored"
  >(() => (navigator.onLine ? "connected" : "offline"));

  useEffect(() => {
    let disconnected = !navigator.onLine;
    const handleOffline = () => {
      disconnected = true;
      setConnectionState("offline");
    };
    const handleOnline = () => {
      if (!disconnected) return;
      disconnected = false;
      setConnectionState("restored");
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!navigator.onLine) return;
    // Tentative unique de restauration via le cookie de refresh ; les appels concurrents sont sérialisés.
    void restoreSession().finally(() => setStarted(true));
  }, []);

  if (connectionState === "offline")
    return (
      <OfflinePage
        onRetry={() =>
          setConnectionState(navigator.onLine ? "restored" : "offline")
        }
      />
    );
  if (connectionState === "restored") return <ConnectionRestoredPage />;

  return started ? <RouterProvider router={router} /> : null;
}
