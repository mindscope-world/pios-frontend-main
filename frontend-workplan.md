# Pi OS Frontend — Implementation Workplan

Source documents: `FRONTEND_GUIDE.md` (this dir), `CrypGo Web — Cryptocurrency Landing page.jpeg` (this dir, palette/mood reference only), and `../pios-backend-main/project_dev.md` (ground-truth backend audit, 2026-07-05).

Backend facts below were re-verified directly against `pios-backend-main` source on 2026-07-06, not just quoted from the guide:
- API serves on **port 9000** (`Dockerfile`, `docker-compose.yml`), CORS allows `localhost:5173`/`3000`.
- `app/api/v1/router.py` wires 16 endpoint modules (~109 routes): `auth, users, brokers, market, orders, positions, strategies, risk, alerts, audit, data_quality, intelligence, behavior, capital, execution_quality (data/tca/market-ticks), websocket`.
- The three critical bugs `project_dev.md` documents as live (`Order.transition()` missing, `get_redis()` arg mismatch, `risk.py` swapped args, hardcoded `sharpe`/`win_rate`) are **already fixed** in current code — confirmed by reading `app/models/all_models.py:411`, `app/core/redis.py`, `app/api/v1/endpoints/risk.py`, and `app/services/positions_service.py` directly. Git history (`4d7a1d1`, `6d6a800`, `237a1c0`) is exactly these fixes landing. So the guide's picture is current, not aspirational.
- Redis pub/sub carries **32** channels (`app/core/pubsub.py:CHANNELS`), not a round number — build the WS layer to subscribe to any of them, not a hardcoded subset.
- 38 `/intelligence/*` routes confirmed by direct grep of `intelligence.py`.

---

## 0. Goal and Non-Goals

**Goal**: a role-gated, real-time trading terminal SPA that surfaces exactly what the backend can actually do today — orders/positions/strategies/risk/brokers as the core trading loop, plus the intelligence/behavior/capital/audit surface — without inventing UI for features that don't exist server-side.

**Non-goals (do not build screens/UI for these — confirmed absent server-side, `project_dev.md` §4):**
- Mechanism Observatory (mutual information / spectral independence / N_eff)
- Optuna / TPESampler hyperparameter optimization or a standalone walk-forward validator UI
- Smart Order Router (venue selection, anti-PFOF, adverse-selection scoring)
- Real algorithmic execution for TWAP/VWAP/OCO/ICEBERG — these are **enum labels only**; every order fills instantly regardless of type (`PaperAdapter.submit_order`). Show them as selectable, but label them honestly in the UI (see §6).
- Prometheus/Grafana/OpenTelemetry monitoring dashboards
- Any broker adapter beyond **Alpaca and CCXT/Binance** as "real" — IBKR/OANDA/LMAX/MT5/Custom must force `is_paper: true` in the UI, no live-trading toggle for them.

Treat the design image as **palette and mood reference only** — dark navy/near-black base, mint-green accent (`#22c55e`-family), soft card elevation, rounded pill buttons, generous whitespace. It is a marketing landing page; this app is a dense, authenticated, real-time terminal. Do not port its hero/marketing layout — port its color and card language into the semantic design tokens in §5.

---

## 1. Stack (per `FRONTEND_GUIDE.md` §1 — adopted as-is)

Vite + React 18 + TypeScript, Tailwind CSS, TanStack Query, Zustand, React Router v6, `lightweight-charts` (candles) + Recharts (everything else), React Hook Form + Zod, thin `fetch`/`ky` client with one central JWT-refresh interceptor.

## 2. Scaffold & Environment

- `npm create vite@latest pios-frontend -- --template react-ts`
- `.env.local`: `VITE_API_BASE_URL=http://localhost:9000`, `VITE_WS_BASE_URL=ws://localhost:9000`
- Verify with `curl http://localhost:9000/health` before wiring the client (port is doc-vs-code stale in README; trust the Dockerfile value confirmed above).
- Project structure: adopt `FRONTEND_GUIDE.md` §2 verbatim (`api/`, `realtime/`, `stores/`, `components/`, `pages/`, `routes.tsx`) — it already maps 1:1 to the 16 backend router modules.

**Definition of done**: app boots, hits `/health`, Tailwind + design tokens (§5) load, routing shell renders an empty authenticated layout.

---

## 3. Cross-Cutting Foundations (build once, before any screen)

These are shared infrastructure every phase in §7 depends on — build them first even though they're not a "screen."

### 3.1 Auth + API client
- `POST /auth/login` → tokens; store `access_token` in memory (Zustand), never `localStorage`.
- Central 401 handler in `client.ts`: one in-flight `POST /auth/refresh`, dedupe concurrent 401s, retry once, else force logout.
- `GET /auth/me` on boot to rehydrate session before rendering protected routes.
- Real MFA setup screen backed by `/auth/mfa/setup` (QR) + `/auth/mfa/verify` — this is a working `pyotp` flow, not a stub to skip.

### 3.2 Role-guarded routing
Mirror backend guards exactly — do not invent a separate client-side role taxonomy:
- `require_admin` → admin only (`/risk/limits` admin CRUD, etc.)
- `require_trade_exec` → admin + trader (order submission, broker CRUD, strategy creation, kill switch)
- All other authenticated routes: any role, but note several endpoints self-scope by `owner_id` (a trader's `/orders`/`/brokers` list shows only their own unless admin) — the UI doesn't need extra logic here, just don't be surprised when a non-admin sees a shorter list than expected.

### 3.3 Real-time layer (three distinct mechanisms — use each for its purpose)
1. **`/api/v1/ws`** — generic channel pub/sub over the **32** Redis channels in `app/core/pubsub.py` (`why_not_trade`, `command_center`, `decision_feed`, `order_flow`, `positions`, `equity_curve`, `alerts`, `trading_view_ticks`, `market_ticks`, `regime_history`, `capital_allocation`, etc. — full list in that file, don't hardcode a stale subset). Protocol: send `{"type":"subscribe","channel":...,"symbol":...}` → ack → pushed messages; `{"type":"ping"}` keepalive. Build **one** `useChannelSocket` hook managing a single shared connection (singleton/context), components subscribe/unsubscribe declaratively.
2. **SSE `/intelligence/stream`** — price/analytics/why-not-trade ticker feed, auto-reconnects via native `EventSource`. Use for a market ticker strip / live price panel. Auth is query-param based here (`EventSource` can't send headers) — confirm exact param name against `market_stream`'s dependency before wiring.
3. **SSE `/intelligence/notifications/stream`** — toast/notification center, decoupled from dashboard state.

### 3.4 Worker-cache vs. live-per-request split (`/intelligence/*`)
16 of 38 intelligence routes (decision-feed, regime, OFI, GMIG, adaptation, alpha, features, command-center, scenarios, traces, why-not-trade) are backed by `app/workers/intelligence_worker.py`'s Redis cache, per-symbol, short TTL:
- Poll with TanStack Query `refetchInterval: 3000-5000`, not on-demand.
- **Every one of these screens must handle `{"error": "not_yet_computed", "symbol": ...}`** as a real empty/loading state, not a network error.
- The other ~13 (`/decision/current`, `/montecarlo`, `/signal-conflict`, `/ofi/chart`, `/ofi/auto`, `/ofi/enhanced`, `/gmig/enhanced`, `/montecarlo/auto`, `/signal-conflict/auto`, `/market/*`) are computed live per-request (real DB + live exchange calls) — on-demand fetch + 15-30s stale time, and a loading state that assumes 1-3s latency, not instant.

**Definition of done for §3**: a logged-in session survives a token refresh under concurrent requests; one shared WS connection serves multiple subscribed components; an intelligence tile correctly renders a "waiting for data" state when the worker hasn't populated a symbol yet.

---

## 4. Backend Contract Details to Encode as Types (not fix later)

These are real, current backend behaviors — encode them into `types.ts` / Zod schemas from day one so a bug doesn't get "discovered" mid-build:

- `sharpe: number | null`, `win_rate: number | null` — null means insufficient data, render `"—"`, never `0`.
- `drawdown_limit` is a real `RiskLimit` value now (not a hardcoded 15.0) — still render it as live data, don't cache client-side beyond query staleness.
- `execution_style: "INSTANT" | "ALGORITHMIC"` on every order — currently **always** `"INSTANT"`. Show it on every order row; when a user selects TWAP/VWAP/OCO/ICEBERG, show inline copy ("executes instantly, same as Market — algorithmic execution not yet available").
- Order submission: `price` required client-side (Zod `.refine`) when `order_type` is `LIMIT`/`STOP_LIMIT`, mirroring the backend Pydantic rule, to avoid a round-trip 422.
- Broker creation: `is_paper` must be `true` for any `broker_type` other than `ALPACA`/`BINANCE`/`CCXT` — disable the live-trading toggle client-side for those types rather than surfacing the backend's `422 UnsupportedBrokerError`.
- Kill switch (`POST /risk/killswitch`) requires `mfa_code` if the acting admin has MFA enabled (check `/auth/me.mfa_enabled`) — build the confirm modal to prompt for the code inline, and render `orders_cancelled`/`positions_closed` counts from the response.
- Cancel button disabled once an order's `status` is terminal (`FILLED`/`CANCELLED`/`REJECTED`/`EXPIRED`) — backend 409s either way but don't make users discover that by clicking.

---

## 5. Design System (image → tokens → primitives)

Pull from the CrypGo reference image: near-black background (`#0a0e14`-ish), mint/green primary accent, elevated dark cards with subtle borders, pill-shaped buttons, comfortable padding. Translate that mood into the terminal's semantic token set (do not reuse the marketing layout):

```js
// tailwind.config.js — extend, don't replace
theme: {
  extend: {
    colors: {
      pnl: { positive: '#22c55e', negative: '#ef4444', neutral: '#94a3b8' },
      regime: { bull: '#22c55e', bear: '#ef4444', range: '#eab308', crisis: '#dc2626', recovery: '#3b82f6' },
      decision: { allow: '#22c55e', block: '#ef4444', wait: '#eab308', reduce: '#f97316' },
      severity: { p1: '#dc2626', p2: '#f97316', p3: '#eab308', p4: '#3b82f6' },
      dq: { pass: '#22c55e', flag: '#eab308', reject: '#ef4444' },
    },
  },
}
```

Build shared primitives once, reuse across every §7 screen: `<PnLValue>`, `<RegimeBadge>`, `<DecisionBadge>`, `<SeverityDot>`, plus a card/table shell that echoes the image's elevation and corner radius. Dark theme is default (light toggle is nice-to-have). `font-mono` on every numeric column (price/qty/P&L) — proportional fonts misalign number columns.

**Definition of done**: a token file + 5 primitive components exist and are visually reviewed against the reference image's palette before any screen consumes them.

---

## 6. Phased Delivery (concrete version of guide §10)

### Phase 1 — Auth + Shell
- Screens: Login, MFA setup/verify, protected app shell with role-guarded nav.
- Backend: `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/mfa/setup`, `/auth/mfa/verify`.
- Depends on: §3.1, §3.2, §5 tokens.
- DoD: all 5 seeded demo roles (admin/trader/quant/viewer/compliance — `scripts/seed_users.py`) can log in and see correctly gated nav.

### Phase 2 — Orders + Positions (the core trading loop)
- Screens: Order Ticket (new order form), Order Book/list, Order detail (fills + TCA), Positions table, Portfolio metrics panel, Equity curve.
- Backend: `POST /orders`, `GET /orders`, `GET/DELETE /orders/{id}`, `/orders/{id}/fills`, `/orders/{id}/tca`, `/positions`, `/positions/metrics`, `/positions/equity-curve`.
- Apply §4 contract rules: `execution_style` badge, null-safe `sharpe`/`win_rate`, terminal-state cancel disabling, LIMIT/STOP_LIMIT price validation.
- DoD: a full order lifecycle (submit → fill → appears in positions → shows in equity curve) works end-to-end against a Paper broker, gated to admin+trader for submission (`require_trade_exec`).

### Phase 3 — Risk + Brokers
- Screens: Risk metrics dashboard, Risk limits admin (admin-only), Kill switch with confirm-with-consequences modal, Broker list/CRUD, Broker test-connection panel.
- Backend: `/risk/metrics`, `/risk/limits` (admin CRUD), `/risk/killswitch`, `/brokers/*`, broker `/test`.
- Apply §4: `is_paper` forced/disabled for non-Alpaca/CCXT/Binance types; kill-switch MFA-code prompt; show `latency_p99_ms`/`status`/`error_message` from last test call.
- DoD: kill switch fires correctly with MFA when enabled, shows real cancelled/closed counts; broker creation UI makes it structurally impossible to hit the `is_paper` 422.

### Phase 4 — Strategies
- Screens: Strategy list, lifecycle stepper (IDEA → ... → RETIRED, 8 stages), backtest submission + status polling, Darwin evolution view (read-only).
- Backend: `/strategies`, `/strategies/{id}/advance`, `/strategies/{id}/backtest`.
- Gate copy must reflect real thresholds: PAPER promotion requires Sharpe ≥ 0.8, max drawdown ≤ 15%, ≥ 200 trades — disabled "advance" button with a tooltip explaining which gate is unmet, not a bare dropdown.
- Note for Darwin view: it's real (ranks live strategies, retires bottom 20%, spawns mutated children nightly via Celery beat) — safe to build as a genuine read-only visualization, not a stub.
- DoD: a strategy can be walked through at least IDEA→BACKTEST→PAPER in the UI against real backend gate checks.

### Phase 5 — Real-time layer
- Wire §3.3's WS + both SSE streams into the screens built in Phases 1-4 (live order flow, live positions, live equity curve, toast notifications) — additive polish on top of already-solid request/response screens, not a prerequisite for them.
- DoD: order fills and position updates reflect over WS without a manual refresh; notification toasts fire from the SSE stream.

### Phase 6 — Intelligence suite (build last, screen-by-screen)
- Screens (one per major surface, tabbed workspace is fine): Command Center (`/intelligence/command-center/current` + `/intelligence/quant-core/gates`, 8-gate status strip — real, computed live), Regime, OFI, GMIG, Monte Carlo, Signal Conflict, Adaptation Feed, Alpha Factory/Darwin, Why-Not-Trade, Behavior Monitor (`/behavior/*`), Capital Allocation (`/capital/*`).
- For every screen, classify it against §3.4 (cached/worker vs. live/per-request) before choosing a polling strategy.
- Explicitly out of scope here: nothing beyond what §0's non-goals list — don't build Mechanism Observatory or Smart Order Router placeholders even as "coming soon" UI.
- DoD: every intelligence tile has a real, tested "not yet computed" empty state (not just a network-error fallback).

### Phase 7 — Alerts + Audit
- Screens: Alerts list (severity-colored, P1-P4, bulk-acknowledge), Audit log with a "chain verified ✓" indicator calling `/audit/verify`.
- Backend: `/alerts/*`, `/audit/*`, `/audit/verify`.
- DoD: compliance-role users can view and verify the audit chain without trade-execution permissions.

---

## 7. Sequencing / Dependencies

```
§3 (foundations) ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
                                     │
                                     ▼
                              Phase 5 (real-time, layered onto 1-4)
                                     │
                                     ▼
                     Phase 6 (intelligence) ──► Phase 7 (alerts/audit)
```

Phases 6 and 7 have no hard dependency on each other and can be reordered or parallelized if two people are building; both depend on Phase 1's auth shell and Phase 3's design tokens.

---

## 8. Risks / Watch Items Carried Forward from Backend Audit

- `MarketTick` table population is the one item not re-verified in this pass (`project_dev.md` flagged it as never-written as of 2026-07-05). If still true, most intelligence screens will show real "no_market_data"/"not_yet_computed" states in practice, not edge cases — build those empty states as first-class, not afterthoughts, exactly as §3.4/§6 already plan for.
- The orphaned second execution stack (`app/services/brokers/*`, `app/services/execution/*`) is dead code server-side — the frontend should never call any endpoint suggesting a "smart router" or alternate broker path exists, since none is wired into `router.py`.
- Re-check §0's non-goals list and §4's contract rules against `project_dev.md` periodically — that document is dated and this plan should be revisited if Track B roadmap items land server-side.
