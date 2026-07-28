// Mirrors app/schemas/all_schemas.py — role names and TokenPair shape verified
// directly against app/core/deps.py and app/api/v1/endpoints/auth.py.

export type Role = "admin" | "trader" | "quant" | "viewer" | "compliance";

export interface UserOut {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  // trading_mode (MANUAL/SEMI_AUTOMATIC/AUTOMATIC -- see
  // app/services/trading_mode_service.py) lives here as
  // preferences.trading_mode; any other per-account preference too.
  preferences: Record<string, unknown>;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserOut;
}

export interface LoginPayload {
  email: string;
  password: string;
  mfa_code?: string;
}

export interface MFASetupResponse {
  secret: string;
  qr_uri: string;
}

export interface MessageResponse {
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Orders — mirrors app/schemas/all_schemas.py OrderCreate/OrderOut and
// app/models/all_models.py's OrderSide/OrderType/OrderStatus enums exactly. ──

export type OrderSide = "BUY" | "SELL";

// app/models/all_models.py:26 OrderTypeEnum (the actual DB column enum) accepts
// all 8; a separate OrderType.ALL Python helper only lists the first 4, but
// the SQLAlchemy column — and OrderCreate's own docstring/orders.py — confirm
// all 8 are valid order_type values end to end.
export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT" | "OCO" | "TWAP" | "VWAP" | "ICEBERG";

// Order types with a real slicing/algorithmic execution engine — mirrors
// app/schemas/all_schemas.py's _ALGORITHMIC_ORDER_TYPES exactly. These come
// back SUBMITTED with zero fills and fill over a background slice schedule
// (app/services/execution_algo.py); everything else instant-fills.
export const ALGORITHMIC_ORDER_TYPES: ReadonlySet<OrderType> = new Set(["TWAP", "VWAP", "ICEBERG"]);

export type OrderStatus = "NEW" | "SUBMITTED" | "PARTIAL" | "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED";

// app/models/all_models.py:87-90 — ALLOWED_ORDER_TRANSITIONS has an empty
// transition set for exactly these four; cancel_order's own 409 check only
// lists FILLED/CANCELLED/REJECTED, but EXPIRED still 409s via the
// InvalidTransitionError -> main.py global exception handler. Net effect for
// the UI is the same: disable Cancel once status is one of these four.
export const TERMINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set(["FILLED", "CANCELLED", "REJECTED", "EXPIRED"]);

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.has(status);
}

export type ExecutionStyle = "INSTANT" | "ALGORITHMIC" | "CONDITIONAL";

// Order types armed app-side and fired by the backend's trigger monitor —
// mirrors app/schemas/all_schemas.py's _CONDITIONAL_ORDER_TYPES exactly.
// STOP_LIMIT rests until its stop crosses, then executes as a LIMIT; OCO is
// two linked legs (limit + stop) where one filling cancels the other.
export const CONDITIONAL_ORDER_TYPES: ReadonlySet<OrderType> = new Set(["STOP_LIMIT", "OCO"]);

export function isConditionalOrderType(orderType: OrderType): boolean {
  return CONDITIONAL_ORDER_TYPES.has(orderType);
}

export function isAlgorithmicOrderType(orderType: OrderType): boolean {
  return ALGORITHMIC_ORDER_TYPES.has(orderType);
}

export interface OrderCreatePayload {
  broker_id: string;
  symbol: string;
  side: OrderSide;
  order_type: OrderType;
  qty: number;
  price?: number | null;
  stop_price?: number | null;
  time_in_force?: string;
  strategy_id?: string | null;
  algo_config?: Record<string, unknown> | null;
}

// Semi-auto confirm (§3.1) — mirrors app/schemas/all_schemas.py's
// ConfirmDecisionRequest exactly: deliberately minimal, everything about
// the order's actual terms (side, qty, whether it's even allowed to fire)
// is re-derived server-side from the live decision, not trusted from here.
export interface ConfirmDecisionPayload {
  symbol: string;
  broker_id: string;
  client_order_id?: string | null;
}

// Autonomous execution (AUTO trading mode) — mirrors app/schemas/all_schemas.py's
// AutoExecutionArm/DisarmRequest + AutoExecutionArmingOut. Paper MT5 brokers
// only, per-symbol arming, three circuit breakers; see AutomaticControl.tsx.
export interface AutoExecutionArmPayload {
  symbol: string;
  broker_id: string;
}

export interface AutoExecutionDisarmPayload {
  symbol: string;
  broker_id?: string | null;
}

export interface AutoExecutionArmingOut {
  id: string;
  symbol: SymbolOut | null;
  broker_id: string;
  is_armed: boolean;
  armed_at: string | null;
  disarmed_at: string | null;
  // "user_disarm" | "circuit_breaker:daily_loss" | "circuit_breaker:drawdown"
  // | "circuit_breaker:max_orders" | "kill_switch" | null
  last_disarm_reason: string | null;
  last_evaluated_at: string | null;
  last_order_id: string | null;
  orders_fired_today: number;
  created_at: string;
}

export interface OrderStateEvent {
  from: string | null;
  to: string;
  reason: string | null;
  at: string;
}

export interface OrderOut {
  id: string;
  client_order_id: string | null;
  broker_order_id: string | null;
  symbol: SymbolOut | null;
  side: OrderSide;
  order_type: OrderType;
  time_in_force: string;
  qty: number;
  filled_qty: number;
  price: number | null;
  stop_price: number | null;
  avg_fill_price: number | null;
  status: OrderStatus;
  state_history: OrderStateEvent[];
  reject_reason: string | null;
  strategy_id: string | null;
  submitted_at: string | null;
  filled_at: string | null;
  created_at: string;
  // computed_field on the backend — "ALGORITHMIC" for TWAP/VWAP/ICEBERG,
  // "CONDITIONAL" for STOP_LIMIT/OCO (armed, fires on trigger), "INSTANT"
  // otherwise. Show this on every order row.
  execution_style: ExecutionStyle;
  // Model governance (Guide Part IX) — set when this order's notional
  // impact crossed the human-signoff threshold. status stays NEW until a
  // second human (never the submitter) approves/rejects via
  // POST /orders/{id}/signoff — see api/orders.ts.
  signoff_required: boolean;
  signoff_by: string | null;
  signoff_at: string | null;
  signoff_reason: string | null;
}

export interface FillOut {
  id: string;
  order_id: string;
  side: OrderSide;
  qty: number;
  price: number;
  commission: number;
  slippage_bps: number | null;
  funding_cost: number;
  total_cost: number;
  filled_at: string;
}

export interface CancelOrderResponse {
  order_id: string;
  status: OrderStatus;
  message: string;
}

export interface TCAReport {
  order_id: string;
  total_fills: number;
  total_qty: number;
  avg_fill_price: number;
  commission_total: number;
  slippage_bps_avg: number | null;
  spread_cost_bps_avg: number | null;
  funding_cost_total: number;
  total_cost: number;
}

// ── Symbols ──────────────────────────────────────────────────────────────────

export interface SymbolOut {
  id: number;
  symbol: string;
  base_asset: string;
  quote_asset: string;
  asset_class: string;
  exchange: string;
  is_active: boolean;
}

// ── Positions & Portfolio ────────────────────────────────────────────────────

export interface PositionOut {
  id: string;
  symbol: SymbolOut | null;
  // Position side is LONG/SHORT (all_models.py PosSideEnum), not the
  // BUY/SELL order side.
  side: "LONG" | "SHORT";
  qty: number;
  avg_cost: number;
  unrealized_pnl: number;
  realized_pnl: number;
  margin_used: number;
  is_open: boolean;
  opened_at: string;
}

export interface EquityPoint {
  day: number;
  value: number;
  snapshot_at: string;
}

export interface PortfolioMetricsOut {
  total_equity: number;
  equity_change: number;
  equity_change_pct: number;
  realized_pnl: number;
  realized_today: number;
  unrealized_pnl: number;
  active_strategies: number;
  max_drawdown: number;
  // Real RiskLimit-backed value now, not a hardcoded 15.0 — still render as
  // live data (don't cache beyond normal query staleness).
  drawdown_limit: number;
  // null = insufficient equity history / no closed positions yet — render
  // "—", never coerce to 0. See components/ui/NullableNumber.tsx.
  sharpe: number | null;
  win_rate: number | null;
}

// ── Brokers — mirrors app/schemas/all_schemas.py BrokerCreate/BrokerOut and
// app/models/all_models.py:105-114 BrokerType.ALL exactly. ──────────────────

export type BrokerType = "MT5" | "IBKR" | "ALPACA" | "OANDA" | "CCXT" | "LMAX" | "CUSTOM" | "BINANCE" | "TRADOVATE";

// app/services/broker_service.py ADAPTER_MAP — the only broker types with a
// real (non-simulated) adapter. Everything else in BrokerType forces
// is_paper=true or the backend raises 422 UnsupportedBrokerError.
// MT5 has no REST API to call out to -- its adapter depends on an Expert
// Advisor connecting to /ws/mt5/{broker_id} with the broker's `passphrase`
// as a bridge token. Live trading works once that EA is paired; until then
// orders fail fast with a clear "EA not connected" rejection rather than a
// silent paper fill.
// IBKR/LMAX/TRADOVATE: real adapters exist (2026-07-23) but are scaffolded,
// not live-verified — no funded/paper account or gateway access exists in
// this dev environment for any of the three (see Final_development.md §1).
// Listed here as real (not forced to paper) since the backend adapter code
// is genuine and will attempt a real connection, honestly failing with
// whatever the broker/gateway actually reports if misconfigured, rather
// than silently paper-filling.
export const REAL_BROKER_TYPES: ReadonlySet<BrokerType> = new Set(["ALPACA", "BINANCE", "CCXT", "MT5", "OANDA", "IBKR", "LMAX", "TRADOVATE"]);

export function supportsLiveTrading(brokerType: BrokerType): boolean {
  return REAL_BROKER_TYPES.has(brokerType);
}

export interface BrokerCredentials {
  api_key?: string | null;
  api_secret?: string | null;
  account_id?: string | null;
  passphrase?: string | null;
  host?: string | null;
  port?: number | null;
  client_id?: number | null;
}

export interface BrokerCreatePayload {
  name: string;
  broker_type: BrokerType;
  exchange_id?: string | null;
  is_paper: boolean;
  credentials: BrokerCredentials;
  config?: Record<string, unknown>;
}

export interface BrokerOut {
  id: string;
  name: string;
  broker_type: BrokerType;
  exchange_id: string | null;
  is_paper: boolean;
  is_active: boolean;
  status: string;
  last_heartbeat: string | null;
  latency_p99_ms: number | null;
  error_message: string | null;
  config: Record<string, unknown>;
  created_at: string;
}

export interface BrokerTestResult {
  success: boolean;
  latency_ms: number | null;
  message: string;
  account_info: Record<string, unknown> | null;
}

// ── Risk & Kill Switch ───────────────────────────────────────────────────────

export interface RiskLimitCreatePayload {
  name: string;
  scope?: string;
  scope_id?: string | null;
  limit_type: string;
  limit_value: number;
  breach_action?: string;
}

export interface RiskLimitOut {
  id: number;
  name: string;
  scope: string;
  limit_type: string;
  limit_value: number;
  current_value: number | null;
  breach_action: string;
  is_active: boolean;
  updated_at: string;
}

export interface CapitalPreservationStatusOut {
  configured: boolean;
  goal_equity: number | null;
  current_equity: number | null;
  progress_pct: number | null;
  goal_met: boolean;
  stopping_zone_active: boolean;
  breach_action: string | null;
  blocks_new_orders: boolean;
}

export interface RiskMetricsOut {
  var95: number;
  var99: number;
  cvar: number;
  // "historical" = real 30d PnLSnapshot return distribution; "garch_parametric"
  // = real GJR-GARCH vol forecast (insufficient snapshot history);
  // "fallback_estimate" = fixed % of total_equity, no real computation behind
  // it — label the VaR figures accordingly rather than presenting all three
  // as equally live-computed.
  var_source: "historical" | "garch_parametric" | "fallback_estimate";
  // True when total_equity itself has no real PnLSnapshot to read from
  // (defaults to a fabricated $100,000).
  equity_is_estimated: boolean;
  drawdown_current: number;
  // Real RiskLimit-backed value now — same caveat as PortfolioMetricsOut above.
  drawdown_limit: number;
  leverage: number;
  margin_used: number;
  margin_avail: number;
  daily_loss: number;
  daily_loss_limit: number;
  kill_switch_armed: boolean;
  triggers_today: number;
}

export interface KillSwitchPayload {
  reason: string;
  // Required if the acting admin has mfa_enabled (check /auth/me) —
  // app/api/v1/endpoints/risk.py:107-128 400s with a specific message
  // ("MFA code required for kill switch") if omitted while enabled.
  mfa_code?: string;
}

export interface KillSwitchEventOut {
  id: string;
  trigger_source: string;
  reason: string;
  orders_cancelled: number;
  positions_closed: number;
  status: string;
  created_at: string;
}

// ── Alerts — mirrors app/schemas/all_schemas.py AlertOut/AlertAckRequest and
// app/models/all_models.py:34 SeverityEnum ("P1".."P4", P1 highest) exactly.
// GET/ack routes are get_current_user (any authenticated role) server-side —
// no role gate needed client-side. ──────────────────────────────────────────

export type AlertSeverity = "P1" | "P2" | "P3" | "P4";

export interface AlertOut {
  id: string;
  severity: AlertSeverity;
  source: string;
  category: string;
  title: string;
  message: string;
  strategy_id: string | null;
  symbol_id: number | null;
  is_acknowledged: boolean;
  ack_note: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

// ── Audit — mirrors app/schemas/all_schemas.py AuditEntryOut exactly.
// GET /audit and /audit/verify are require_audit (admin + compliance + quant)
// server-side. ───────────────────────────────────────────────────────────────

export interface AuditEntryOut {
  id: number;
  event_time: string;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  record_hash: string;
  prev_hash: string | null;
}

export interface AuditVerifyResult {
  chain_intact: boolean;
  total_entries: number;
  broken_at_id: number | null;
}
