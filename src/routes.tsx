import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireRole } from "./components/auth/RequireRole";
import { AppShell } from "./components/layout/AppShell";
import LandingPage from "./pages/landing/LandingPage";
import Login from "./pages/auth/Login";
import MfaSetup from "./pages/auth/MfaSetup";
import ExecutionPage from "./pages/execution/ExecutionPage";
import OrdersPage from "./pages/orders/OrdersPage";
import OrderDetailPage from "./pages/orders/OrderDetailPage";
import PortfolioPage from "./pages/portfolio/PortfolioPage";
import StrategiesPage from "./pages/strategies/StrategiesPage";
import StrategyDetailPage from "./pages/strategies/StrategyDetailPage";
import RiskPage from "./pages/risk/RiskPage";
import ConnectionsPage from "./pages/connections/ConnectionsPage";
import IntelligencePage from "./pages/intelligence/IntelligencePage";
import CapitalPage from "./pages/capital/CapitalPage";
import AlertsPage from "./pages/alerts/AlertsPage";
import AuditPage from "./pages/audit/AuditPage";
import ExecutionQualityPage from "./pages/execution_quality/ExecutionQualityPage";
import DataQualityPage from "./pages/data_quality/DataQualityPage";
import UsersPage from "./pages/users/UsersPage";

// Started as a 5-destination IA (pi-osq-execution-intelligence-v3.html)
// collapsing orders/positions/alerts/audit into Portfolio / Risk & Safety.
// Orders has since grown into a real screen (order history + detail, the
// core-trading-loop gap flagged in roadmap-development-progress.md §6.1) —
// positions/alerts/audit are still folded in and redirect rather than 404.
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
          { path: "/orders", element: <OrdersPage /> },
          { path: "/orders/:orderId", element: <OrderDetailPage /> },
          { path: "/positions", element: <Navigate to="/portfolio" replace /> },
          { path: "/strategies", element: <StrategiesPage /> },
          { path: "/strategies/:strategyId", element: <StrategyDetailPage /> },
          { path: "/risk", element: <RiskPage /> },
          { path: "/alerts", element: <AlertsPage /> },
          { path: "/connections", element: <ConnectionsPage /> },
          { path: "/brokers", element: <Navigate to="/connections" replace /> },
          { path: "/intelligence", element: <IntelligencePage /> },
          { path: "/capital", element: <CapitalPage /> },
          { path: "/execution-quality", element: <ExecutionQualityPage /> },
          { path: "/data-quality", element: <DataQualityPage /> },
          {
            // GET /audit is require_audit (admin + compliance + quant)
            // server-side — mirror it here rather than let other roles hit
            // a bare 403 after already seeing the page shell render.
            element: <RequireRole roles={["admin", "compliance", "quant"]} />,
            children: [{ path: "/audit", element: <AuditPage /> }],
          },
          {
            // Every users.py route is require_admin (list/create/deactivate)
            // or self-or-admin (get/update) server-side; this screen only
            // ever acts on other users, so gate the whole page to admin.
            element: <RequireRole roles={["admin"]} />,
            children: [{ path: "/users", element: <UsersPage /> }],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
