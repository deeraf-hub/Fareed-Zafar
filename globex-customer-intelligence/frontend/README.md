# Globex Customer Intelligence — frontend

Single-page web app for the Globex Customer Intelligence demo: an overview of sales and
segments, a customer explorer with predictions, per-customer detail, model performance
diagnostics and a data-quality report. It is a portfolio demonstration built on a public
UCI dataset (Online Retail II); it is not Globex or client data.

Stack: Vite 5, React 18, TypeScript (strict), Tailwind CSS 3, react-router-dom 6,
TanStack Query 5, Plotly (`plotly.js-cartesian-dist-min` through `react-plotly.js/factory`; the basic bundle has no heatmap trace),
Vitest + Testing Library for tests.

## Requirements

- Node.js 22 or newer (npm 10).
- The backend API running on `http://localhost:8000` (see the backend README, `gci` CLI).

## Run

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:8000`, so the app works with
`VITE_API_BASE_URL` unset (relative `/api/v1/...` requests). To call an API on another
origin, copy `.env.example` to `.env` and set the variable (the backend must allow that
origin in `CORS_ORIGINS`).

## Environment variables

| Variable            | Default | Meaning                                                                 |
| ------------------- | ------- | ----------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `""`    | Origin of the API, no trailing slash, e.g. `http://localhost:8000`. Empty means same-origin relative requests. Read at build time. |

All requests go to `${VITE_API_BASE_URL}/api/v1/...`.

## Scripts

| Command           | What it does                                              |
| ----------------- | --------------------------------------------------------- |
| `npm run dev`     | Vite dev server with hot reload and `/api` proxy          |
| `npm run build`   | `tsc --noEmit` (type check) then `vite build` into `dist/` |
| `npm run preview` | Serves `dist/` locally (also proxies `/api`)              |
| `npm test`        | Runs the Vitest suite once (jsdom, `fetch` is mocked)     |
| `npm run test:watch` | Vitest in watch mode                                   |
| `npm run lint`    | Type checks the app and the config files                  |

## Test

```bash
npm test
```

Tests live in `src/test/` and never touch the network: `fetch` is replaced with an
in-memory handler and Plotly is mocked where a page renders charts. Coverage:

- `format.test.ts` — GBP, percent, date, number and unit formatters.
- `CustomerExplorer.test.tsx` — rows from a mocked API, segment filter and sort changes
  refetch with the right query string, the Export CSV link carries the same parameters.
- `PredictionCell.test.tsx` — "Unavailable" with the API reason when a prediction is
  missing; percent / GBP formatting otherwise.
- `Overview.test.tsx` — KPI tiles from mocked data, the historical banner with the data
  cutoff, error state with Retry.

## Build and Docker

```bash
npm run build        # outputs dist/
```

The `Dockerfile` is multi-stage: Node builds the app, then `nginx:1.27-alpine` serves
`dist/` with `nginx.conf`, which falls back to `index.html` for client-side routes and
proxies `/api/` to `http://api:8000/api/` (the backend service name in docker-compose).
Because the image is built with `VITE_API_BASE_URL` empty, the browser makes relative
`/api` requests that nginx forwards.

```bash
docker build -t gci-frontend .
docker run --rm -p 8080:80 gci-frontend   # expects a reachable "api" host, e.g. via compose
```

Pass `--build-arg VITE_API_BASE_URL=https://api.example.com` to bake in another origin.

## Project layout

```
src/
  api/          typed client (client.ts) and API contract types (types.ts)
  components/   layout, cards, KPI tiles, data table, pagination, inputs, states, chart wrapper
  hooks/        react-query hooks per endpoint, debounce
  lib/          formatters, labels, URL-state helpers for the explorer, error helpers
  pages/        Overview, CustomerExplorer, CustomerDetail, DataQuality, models/ (Model Performance)
  test/         Vitest setup, fixtures and tests
```

## Notes

- Filters, sort and pagination on the Customer Explorer live in the URL query string, so
  links are shareable. The Export CSV link is built from the same parameters (without
  pagination) and points at `GET /api/v1/customers/export.csv`.
- The historical banner and footer attribution come from `GET /api/v1/dataset`.
- No numbers are hardcoded in the app; every value comes from the API. Mock data exists
  only under `src/test/`.
