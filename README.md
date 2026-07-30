# Pi-OSQ Frontend

React + TypeScript + Vite single-page app for **Pi OS** — a real-time execution intelligence terminal for the institutional quant trading platform. Talks to the [`pios-backend-main`](../pios-backend-main) FastAPI service over REST, WebSockets, and Server-Sent Events.

## Tech Stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Framework | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Server state | TanStack Query |
| Client state | Zustand |
| Routing | React Router v7 |
| Charts | `lightweight-charts` (OHLCV/candles) + Recharts (equity curves, allocation, metrics) |
| Forms | React Hook Form + Zod |
| HTTP client | `ky` |
| Linting | oxlint |

## Prerequisites

- **Node.js 22+** and npm (the production Docker image builds on `node:22-slim`)
- The [backend API](../pios-backend-main) running and reachable — see that repo's README for its own Quick Start. By default this app expects it at `http://localhost:9000`.

## Quick Start (local dev)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional — see note below)
cp .env.example .env.local

# 3. Start the dev server
npm run dev
# → http://localhost:5173
```

By default `.env.local` ships with `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` **empty**, meaning API calls go to the same origin as the page. In dev, Vite's built-in proxy (see `vite.config.ts`) forwards `/api` requests to `http://localhost:9000`, so no configuration is needed as long as the backend is running locally on its default port — this also makes the dev server work unmodified behind a public tunnel (ngrok, Cloudflare Quick Tunnels), since `allowedHosts` is already configured for those.

To point at a different backend (e.g. a staging deployment), set both variables explicitly in `.env.local`:

```bash
VITE_API_BASE_URL=https://your-api-host
VITE_WS_BASE_URL=wss://your-api-host
```

### Login

Use one of the backend's seeded demo accounts (see `pios-backend-main`'s README) — e.g. `admin@pios.com` / `admin@123`. Those users must be seeded on the backend first (`python scripts/seed_users.py`), the backend does not seed them automatically.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload at `:5173` |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally for a final check |
| `npm run lint` | Run `oxlint` over the codebase |

## Running with Docker

The production image is a multi-stage build: Node builds the static bundle, then it's served by nginx.

```bash
# Build the image — API URLs are baked in at build time via build args
docker build \
  --build-arg VITE_API_BASE_URL=http://localhost:9000 \
  --build-arg VITE_WS_BASE_URL=ws://localhost:9000 \
  -t pios-frontend .

# Run it
docker run -p 8080:8080 pios-frontend
# → http://localhost:8080
```

`nginx.conf` serves the SPA with client-side routing fallback (`try_files ... /index.html`), gzip for text/JS/CSS/JSON/SVG, and long-lived caching for hashed `/assets/` files.

> Because `VITE_*` values are inlined into the JS bundle at build time (standard Vite behavior), changing the backend URL requires **rebuilding the image**, not just restarting the container. For local Docker Compose setups that run both repos together, point `VITE_API_BASE_URL` at the backend container's exposed host port.

### Cloud deployment

`cloudbuild.yaml` shows a working Google Cloud Build pipeline that builds this same Dockerfile with production build args and pushes to Artifact Registry — use it as a reference for CI/CD, adjusting the image path and API URLs for your own project.

## Project Structure

```
pios-frontend-main/
├── index.html
├── vite.config.ts              # Dev server proxy (/api → :9000), allowed tunnel hosts
├── Dockerfile                  # Multi-stage build: node → nginx
├── nginx.conf                  # SPA routing + gzip + asset caching
├── cloudbuild.yaml             # Cloud Build reference pipeline
├── .env.example / .env.local   # VITE_API_BASE_URL, VITE_WS_BASE_URL
├── public/                     # Static assets served as-is (favicon, icon sprite)
└── src/
    ├── main.tsx                # Entry point
    ├── api/                    # Typed API clients per resource (auth, orders, capital, ...)
    ├── realtime/                # WebSocket + SSE hooks (market stream, notifications)
    ├── stores/                  # Zustand stores (auth, terminal state)
    ├── schemas/                 # Zod validation schemas
    ├── components/
    │   ├── ui/                  # Design-system primitives
    │   ├── auth/, brokers/, execution/, intelligence/, orders/, risk/, strategies/, trading/
    │   └── layout/, notifications/
    ├── pages/                   # One directory per route: auth, portfolio, orders, execution,
    │                            # execution_quality, capital, risk, strategies, backtest,
    │                            # intelligence, data_quality, alerts, audit, users, connections, landing
    └── utils/
```

See `FRONTEND_GUIDE.md` in this repo for the original architecture rationale (auth flow, role-based routing, realtime protocol, and known backend gotchas).

## Connecting to the Backend

This app is built specifically against `pios-backend-main`'s API. Key things to know:

- **Auth**: JWT access token attached as `Authorization: Bearer <token>`; a 401 triggers a single refresh-and-retry via `/api/v1/auth/refresh`, then forces logout on repeated failure.
- **Roles**: route guards mirror the backend's role model — `admin`, `trader`, `quant`, `viewer`, `compliance`. Order submission, broker CRUD, and the kill switch are restricted to `admin`/`trader`.
- **Realtime**: a channel-subscription WebSocket at `/api/v1/ws`, plus SSE streams for market data (`/api/v1/intelligence/stream`) and notifications (`/api/v1/intelligence/notifications/stream`).

## Linting & Type Checking

```bash
npm run lint       # oxlint
npx tsc -b         # type check only, no build output
```
