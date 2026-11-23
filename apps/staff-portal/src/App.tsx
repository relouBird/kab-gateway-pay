import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { LoadingState } from "./components/ui/LoadingState";
import {
  ConnectionPage,
  type ConnectionPageState,
} from "./pages/ConnectionPage";
import { appRoutes } from "./routes/appRoutes";
import { restoreSession } from "./services/sessionManager";

export function App() {
  const [ready, setReady] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "connected" | ConnectionPageState
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
    void restoreSession().finally(() => setReady(true));
  }, []);

  if (connectionState !== "connected") {
    return (
      <ConnectionPage
        state={connectionState}
        onRetry={() =>
          setConnectionState(navigator.onLine ? "restored" : "offline")
        }
      />
    );
  }

  return ready ? <RouterProvider router={appRoutes} /> : <LoadingState />;
}
