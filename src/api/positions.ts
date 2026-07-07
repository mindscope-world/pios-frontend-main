import { apiFetch } from "./client";
import type { EquityPoint, PortfolioMetricsOut, PositionOut } from "./types";

export function listPositions() {
  return apiFetch<PositionOut[]>("/positions");
}

export function getPortfolioMetrics() {
  return apiFetch<PortfolioMetricsOut>("/positions/metrics");
}

export function getEquityCurve() {
  return apiFetch<EquityPoint[]>("/positions/equity-curve");
}
