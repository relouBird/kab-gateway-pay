import type { RouteObject } from "react-router";
import { AppLayout } from "../components/layout/AppLayout";
import { AuthLayout } from "../components/layout/AuthLayout";
import { PublicOnly, RequireAuth } from "../components/layout/guards";
import { AccountPage } from "../pages/AccountPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { MfaPage } from "../pages/MfaPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { SessionsPage } from "../pages/SessionsPage";
import { VerifyContactPage } from "../pages/VerifyContactPage";

export const appRoutes: RouteObject[] = [
  {
    element: <PublicOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/mfa", element: <MfaPage /> },
          { path: "/register", element: <RegisterPage /> },
          { path: "/verify-contact", element: <VerifyContactPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
          { path: "/reset-password", element: <ResetPasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/account", element: <AccountPage /> },
          { path: "/sessions", element: <SessionsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];
