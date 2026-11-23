import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { appRoutes } from "./routes/appRoutes";
import { restoreSession } from "./services/sessionManager";

const router = createBrowserRouter(appRoutes);

export function App() {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // Tentative unique de restauration via le cookie de refresh ; les appels concurrents sont sérialisés.
    void restoreSession().finally(() => setStarted(true));
  }, []);

  return started ? <RouterProvider router={router} /> : null;
}
