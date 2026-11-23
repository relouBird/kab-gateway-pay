import { createBrowserRouter, Navigate } from "react-router";
import { AuthLayout } from "../components/layout/AuthLayout";
import { StaffLayout } from "../components/layout/StaffLayout";
import {
  PublicOnly,
  RequireAdmin,
  RequireStaff,
} from "../components/layout/guards";
import { AdminPage } from "../features/admin/AdminFeature";
import { AccessDeniedPage } from "../pages/AccessDeniedPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { InvitationPage } from "../pages/auth/InvitationPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { MfaPage } from "../pages/auth/MfaPage";
import { StaffSessionsPage } from "../pages/StaffSessionsPage";

export const appRoutes = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        element: <PublicOnly />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/mfa", element: <MfaPage /> },
          { path: "/accept-invitation", element: <InvitationPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
      { path: "/access-denied", element: <AccessDeniedPage /> },
    ],
  },
  {
    element: <RequireStaff />,
    children: [
      {
        element: <StaffLayout />,
        children: [{ path: "/my-sessions", element: <StaffSessionsPage /> }],
      },
    ],
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <StaffLayout />,
        children: [{ path: "/admin", element: <AdminPage /> }],
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
