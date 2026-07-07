import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireRole } from "./components/auth/RequireRole";
import { AppShell } from "./components/layout/AppShell";
import LandingPage from "./pages/landing/LandingPage";
import Login from "./pages/auth/Login";
import MfaSetup from "./pages/auth/MfaSetup";
import ExecutionPage from "./pages/execution/ExecutionPage";
import PortfolioPage from "./pages/portfolio/PortfolioPage";
import StrategiesPage from "./pages/strategies/StrategiesPage";
import RiskPage from "./pages/risk/RiskPage";
import ConnectionsPage from "./pages/connections/ConnectionsPage";
import IntelligencePage from "./pages/intelligence/IntelligencePage";

// 5-destination IA (pi-osq-execution-intelligence-v3.html) replacing the
// earlier 9-item nav — orders/positions/alerts/audit content now lives one
// tap in from Portfolio / Risk & Safety rather than as separate routes.
// Old bookmarks/links redirect rather than 404.
export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <Login /> },
  {
    element: <RequireRole />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/settings/mfa", element: <MfaSetup /> },
          { path: "/execution", element: <ExecutionPage /> },
          { path: "/portfolio", element: <PortfolioPage /> },
          { path: "/orders", element: <Navigate to="/portfolio" replace /> },
          { path: "/positions", element: <Navigate to="/portfolio" replace /> },
          { path: "/strategies", element: <StrategiesPage /> },
          { path: "/risk", element: <RiskPage /> },
          { path: "/alerts", element: <Navigate to="/risk" replace /> },
          { path: "/audit", element: <Navigate to="/risk" replace /> },
          { path: "/connections", element: <ConnectionsPage /> },
          { path: "/brokers", element: <Navigate to="/connections" replace /> },
          { path: "/intelligence", element: <IntelligencePage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
