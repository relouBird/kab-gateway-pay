import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { LoadingState } from "./components/ui/LoadingState";
import { appRoutes } from "./routes/appRoutes";
import { restoreSession } from "./services/sessionManager";

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void restoreSession().finally(() => setReady(true));
  }, []);

  return ready ? <RouterProvider router={appRoutes} /> : <LoadingState />;
}
