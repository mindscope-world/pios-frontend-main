import { apiFetch } from "./client";
import type {
  AutoExecutionArmPayload,
  AutoExecutionArmingOut,
  AutoExecutionDisarmPayload,
} from "./types";

// Autonomous execution (AUTO trading mode) — POST /auto-execution/arm|disarm,
// GET /auto-execution/status. Deliberately minimal payloads, same posture as
// confirmDecision: the backend is the source of truth for everything about
// the resulting orders (side/qty/eligibility), this just says which symbol
// on which broker to watch. See app/services/auto_execution_service.py.
export function armAutoExecution(payload: AutoExecutionArmPayload) {
  return apiFetch<AutoExecutionArmingOut>("/auto-execution/arm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function disarmAutoExecution(payload: AutoExecutionDisarmPayload) {
  return apiFetch<AutoExecutionArmingOut[]>("/auto-execution/disarm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAutoExecutionStatus() {
  return apiFetch<AutoExecutionArmingOut[]>("/auto-execution/status");
}
