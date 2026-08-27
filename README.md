# PortCast

> **SIH 2026 · SIH26006 · Software · Transportation & Logistics**
> *Predict Freight. Optimize Chartering. Move Cargo Smarter.*

An AI-powered maritime intelligence platform that forecasts dry-bulk freight rates, monitors geopolitical / weather disruptions, and recommends optimal vessel chartering and bulk cargo procurement strategies for cargo arriving at **India's East Coast ports** (Paradip, Visakhapatnam, Haldia, Dhamra, Ennore, Krishnapatnam, Tuticorin).

Built around a **hybrid LightGBM + XGBoost ensemble** trained on Baltic indices, commodity prices, fuel prices, port congestion and live Yahoo Finance feeds, with explainability (SHAP-lite) and a What-If scenario simulator.

---

## Table of Contents

1. [Features](#features)
2. [Quick start](#quick-start)
3. [Architecture](#architecture)
4. [How the ML is trained](#how-the-ml-is-trained)
5. [The 6 product views](#the-6-product-views)
6. [How the API works](#how-the-api-works)
7. [How the optimizer works](#how-the-optimizer-works)
8. [Data sources](#data-sources)
9. [Project layout](#project-layout)
10. [Environment variables](#environment-variables)
11. [Tested behaviour](#tested-behaviour)
12. [SIH 2026 alignment](#sih-2026-alignment)
13. [Credits](#credits)

---

## Features

### Hybrid ML forecasting
- **Point + quantile ensemble**: `pred = (LightGBM + XGBoost) / 2`, with separate P10 (lower) and P90 (shock upper) LightGBM quantile regressors.
- **7 / 14 / 30 day forecast horizons** plus a 30-day day-by-day trajectory.
- **R² = 0.9943** on the held-out 15% test split (RMSE 0.20, MAE 0.15).
- **Feature importance** averaged across both models (`rate_ma_14`, `rate_ma_7`, `rate_momentum_7`, `rate_lag_1`, `rate_lag_7` dominate).

### Booking window heatmap
- 30-day strip showing each day's expected rate vs today (blue = cheaper, orange = dearer).
- ★ marker on the cheapest day, vertical `T` line on today, hover tooltip with `D+N · $/MT`.

### What-If stress simulator
- 3 sliders (bunker ±30%, port congestion ±25%, demand ±20%).
- Live multiplicative morph of the P10/P90 confidence bands and point forecast.
- Visual state: baseline (sky) / rate-up alarm (rose) / rate-down relief (emerald) with inline Reset and an above-chart shock banner.
- Falls under SIH §2.4 *"What happens to freight cost if Brent crude rises by 15%?"*

### Spot vs TC & COA comparison
- 4 contracts × 4 columns (Type, Rate $/MT, Δ vs Spot, Duration, Risk).
- Parcel size input (1k–400k MT) → 4 cumulative cost tiles.
- Cumulative cost **Pareto bar chart** with the cheapest contract highlighted in emerald.

### Geopolitical Risk Radar
- Live news radar (gcaptain, splash247 RSS) with severity scoring.
- 5 chokepoint entities: Hormuz, Red Sea, Malacca, Bay of Bengal + Suez.
- Severity multiplier: `1 + score/500` applied to baseline rate.
- Severity + region filters, empty state, and "Jump to Simulator" anchor.

### Stress Simulator panel
- 4 scenario parameters (bunker, congestion, demand, cyclone) + chokepoint closure toggle.
- 3 baseline presets (Calm, Monsoon worst-case, Red Sea crisis).
- Waterfall chart: base → bunker → wait → demand → cyclone → chokepoint.
- Live reset + formula explainer strip.

### Port compliance matrix
- 9 East Coast ports (Paradip, Vizag, Haldia, Dhamra, Ennore, Krishnapatnam, etc.).
- Vessel-class fit (HS Handysize / SM Supramax / PM Panamax / CS Capesize) per port.
- Haldia 8.5 m draft + Sandheads lighterage auto-handled.
- Filter input with X clear button.

### Decision Co-Pilot UI
- Solid navbar, animated market ticker with Live pulse, full-bleed voyage video background on Home.
- WCAG 2.1 compliant (text-shadow halos, 4.5:1 contrast on critical text, `prefers-reduced-motion` honored).
- A11y: `aria-label` on all icon-only controls, `aria-pressed` on segmented chips.
- Custom glass system: `--pc-card 0.96`, `glass-card-dense 0.98`, blur 20/24, shadow 0.13, beam 0.88.

---

## Quick start

The repo includes a single `start-all.sh` that boots the three services in the background.

```bash
git clone <repo>
cd PortCast
chmod +x start-all.sh
./start-all.sh
```

The script will:
1. Create `ml/venv/` if missing, `pip install -r requirements.txt`, then `python train.py` to retrain the LightGBM + XGBoost bundle.
2. Boot the **ML service** (FastAPI on `:8000`).
3. `npm install` and boot the **API server** (Express on `:5000`).
4. `npm install` and boot the **frontend** (Vite on `:5173`).

Once it prints `ALL UP: http://localhost:5173`, open the URL and the app loads with 6 views accessible via hash route (`#home`, `#dashboard`, `#forecaster`, `#optimizer`, `#ports`, `#risk`).

To stop everything:

```bash
kill $(cat /tmp/portcast-{ml,server,client}.pid)
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            PortCast Platform                            │
├────────────────┬─────────────────────────┬──────────────────────────────┤
│   1. HYBRID ML │   2. GEOPOLITICAL RADAR │   3. CHARTER OPTIMIZER        │
│   • LightGBM   │   • News RSS            │   • Draft vs DWT filter       │
│   • XGBoost    │   • Chokepoint severity │   • Haldia lighterage (8.5m) │
│   • Quantile   │   • Cyclone/weather     │   • Voyage cost (hire,       │
│     P10/P90    │   • Severity multiplier │     bunker, dues, demurrage)  │
│   • SHAP-lite  │                         │   • Cost/MT ranking + 30-day  │
│     driver     │                         │     timing                    │
│     panel      │                         │                              │
├────────────────┴─────────────────────────┴──────────────────────────────┤
│                       4. DECISION CO-PILOT UI                          │
│   • 6 product views (Home, Dashboard, Forecaster, Optimizer, Ports,    │
│     Risk) + glassmorphic glass-card system                              │
│   • Interactive What-If simulator, Pareto, booking heatmap               │
└──────────────────────────────────────────────────────────────────────────┘
```

**Three-service layout** (all local, all behind hash routes):

| Service | Port | Stack | Role |
|---|---|---|---|
| Frontend | 5173 | React 18 + Vite + Tailwind | SPA, all UI |
| API server | 5000 | Node.js + Express | REST gateway, controllers, optimizer, rate-multiplier application |
| ML service | 8000 | Python FastAPI + LightGBM + XGBoost | model bundle, forecast, radar |

Express bridges to the ML service (`server/src/services/mlBridgeService.js`, 4s timeout + retry) and falls back to its own synthetic market engines when the ML service is down — the UI always renders, flagging reference data honestly.

---

## How the ML is trained

The training pipeline is in `ml/train.py` and runs end-to-end in about 10–20 s on a modern laptop.

### 1. Dataset assembly (`ml/data_builder.py`)
The composite dataset `ml/data/processed_freight_master.csv` is built from four sources, in this order:

1. **Shipping disruptions** (`shipping_disruptions.csv`, 2.5 k rows) — port wait days, disruption index, fuel price index, on-time %.
2. **Commodity prices** (`commodity_prices_supply_chain.csv`, ~110 k rows) — Brent crude, coal, iron ore, copper, aluminium, fertilizer.
3. **Live Yahoo Finance feeds** — `BDRY` (Breakwave Dry Bulk ETF), `CL=F` (WTI crude), `BZ=F` (Brent), `SBLK` (Star Bulk Carriers), `GNK` (Genco).
4. **Domain masters** — `server/src/data/portsData.js` (9 East Coast + 7 global origin ports), `vesselsData.js` (5 vessel classes), `routesData.js` (20 routes).

The data is left-joined on `date`, then forward-filled. The final feature set is 33 columns × ~4,200 rows.

### 2. Feature engineering
- **Causal lags** of the target: `rate_lag_1, 2, 3, 5, 7, 14` (so the model can learn autoregression without peeking at the same instant).
- **Moving averages**: `rate_ma_7, 14, 30`.
- **Volatility**: `rate_std_7, 14, 30`.
- **Momentum**: `rate_momentum_7, 14, 30` (`Δ rate / rate`).
- **Energy**: `oil_ma_7, 14, 30` (fuel is a key cost driver).
- **Congestion**: `wait_days_ma_7, 14, 30`.
- **Seasonality**: `month, quarter, day_of_year, is_sw_monsoon, is_cyclone_season`.

**Leak guard**: `bdry_close` (same-day BDRY) is excluded — it's contemporaneous with the target.

### 3. Train / test split
85% train, 15% test, **time-ordered** (no random shuffle — the model has to forecast the future).

### 4. Model A — LightGBM point regressor
```python
lgb.LGBMRegressor(
    n_estimators=300, learning_rate=0.03, num_leaves=31,
    random_state=42, verbosity=-1,
)
```
Metrics on test: **RMSE 0.2059 · MAE 0.1548 · R² 0.9940**.

### 5. Model B — XGBoost point regressor
```python
xgb.XGBRegressor(
    n_estimators=300, learning_rate=0.03, max_depth=6,
    subsample=0.85, colsample_bytree=0.85, tree_method='hist',
    random_state=42, verbosity=0,
)
```
Metrics on test: **RMSE 0.2426 · MAE 0.1703 · R² 0.9917**.

### 6. Hybrid ensemble
```python
preds_ens = (preds_lgb + preds_xgb) / 2.0
```
Metrics: **RMSE 0.2007 · MAE 0.1466 · R² 0.9943** (ensemble beats either alone). The serving path automatically picks the better of (ensemble, LightGBM) per retrain.

### 7. Quantile bands (P10 / P90)
```python
lgb.LGBMRegressor(objective="quantile", alpha=0.10, ...)  # P10
lgb.LGBMRegressor(objective="quantile", alpha=0.90, ...)  # P90
```
The P10/P90 bands widen with horizon: near-term days are tightest, Day 30 the widest — reflecting cumulative forecast uncertainty.

### 8. Feature importance averaging
For UI display, importance gain is normalized to 0–1 per model, then averaged across the two models. The top-10 are written to `ml/models/model_metadata.json` and used by the SHAP-lite panel on the Forecaster.

### 9. Recursive 30-day forecast
The ML service does a single-shot regression to predict the next-30-day average, then walks the trajectory forward day by day using:
- `expected_rate[t+1] = expected_rate[t] * (1 + momentum_t * 0.5)` damped by the LightGBM quantile envelope.
- `p90_upper[t+1] = max(p90_upper[t] * 1.005, expected_rate[t+1] * 1.05)` (slow widening).

The Express server then re-anchors this trajectory to the *current* spot rate returned by its own `forecastRates()` engine, so the UI shows a rate curve that's continuous with the displayed today price.

### 10. Retrain
Re-run `python ml/train.py` whenever the dataset or feature set changes. The bundle is saved to `ml/models/freight_forecasting_bundle.pkl` and a fast-readable metadata to `model_metadata.json`. The ML service hot-loads on restart.

---

## The 6 product views

The single SPA lives in `client/src/preview_new/`. Six lazy-loaded routes, all sharing the same navbar + animated ticker.

### Home (`#home`)
Full-bleed **voyage video background** (`/public/keyframes/hero_voyage_clean.mp4` + 140-frame canvas scrubber fallback) with watermark cropped 11% / `object-position 62% center` so the editor watermark stays off-screen.

Hero: WCAG-compliant text shadow (white halo 18 px) on the h1 so dark text reads on bright ship hull. Three CTAs (Launch Market Overview, Freight Rate Forecaster, 3-second narrative).

HUD pill row: AIS vessel name, lat/lon, voyage progress. Value metrics strip (3 KPI tiles with `kpi-value-gradient`).

### Dashboard (`#overview`)
- 4 KPI cards (Routes, Avg Spot, 30-Day Momentum, Active Risk Alerts) with sparklines + semantic trend pills.
- `Active Risk Alerts` pill now uses a **LOW / MED / HIGH scale** (`0 → clear`, `1-4 → N LOW`, `5-7 → N MED`, `8+ → N HIGH`).
- Image marquee (caption-aware edge fade, 8 slides).
- Route projections table + East Coast Port Status horizontal bar chart.

### Freight Forecaster (`#forecaster`)
- **Route selector** with 4 commodity-tagged route chips + live ML intelligence grid (MAPE / RMSE / R² / Directional Accuracy / Model Type / Confidence).
- **What-If Scenario** card (3 sliders × shock-state colors).
- **Multi-Horizon Rate Trajectory** Area chart (180-day historical + 30-day forecast) with P10/P90 confidence bands + monsoon `ReferenceArea`.
- **Booking window** 30-day heatmap (cheapest-day ★, today line, hover tooltip).
- **Model Performance** metrics + Optimal Market Entry + Δ vs Spot table + **Cumulative Cost Pareto** bar chart.
- **Why this forecast?** panel (SHAP-lite, 5 drivers) on the right of the table.

### Charter Optimizer (`#optimizer`)
- Inputs: shipping route, bunker fuel price, voyage parameters.
- 4 vessel class cards (Handysize / Supramax / Panamax / Capesize) with:
  - **Voyage waterfall strip** (Hire / Bunker / Port / Lighterage) above pie.
  - Capacity utilization bar (now actually visible — fixed from framer `whileInView` opacity-0 bug).
  - Infeasible cards (Capesize when no port accepts it) collapse to a tightened "constraints exceeded" message.
- Spot vs TC table + Best port finder.

### Port Restrictions (`#ports`)
- 9-row Master Compliance Matrix with vessel-class fit (✓ / ✗) + draft / LOA / beam / wait / discharge / commodities per port.
- **Filter input** with search icon + clear button (clearable from any state).
- 9 terminal cards (Thermal / Coking / Iron / Container etc.) below.

### Risk Radar (`#risk`)
- Hero with "Jump to Simulator" anchor + active alert count pill.
- Severity segmented chip (ALL / HIGH / MEDIUM / LOW) + region dropdown (8 chokepoints incl. Hormuz, Red Sea, Bay of Bengal, Indian Subcontinent).
- 12 active alert cards (severity + impact + affected routes + relative time).
- **Stress Simulator** panel (4 sliders + 3 presets + 2 chokepoint toggles + waterfall chart + Reset).
- Global Chokepoint Radar SVG world map with route arcs and live radar markers.

---

## How the API works

Express endpoints are defined in `server/src/routes/api.js`:

| Method | Path | Source | Returns |
|---|---|---|---|
| `GET` | `/api/health` | inline | status + timestamp |
| `GET` | `/api/dashboard` | `controllers/getDashboard` | KPI snapshot + 5 route forecasts + market indicators + alerts |
| `GET` | `/api/ports` | `controllers/getPorts` | 9 East Coast + 7 global origins |
| `GET` | `/api/ports/:id` | `controllers/getPortDetails` | single port + routes + idle risk |
| `GET` | `/api/optimize/ports` | `controllers/getPortComparison` | best port for origin + parcel + bunker |
| `GET` | `/api/vessels` | `controllers/getVessels` | 5 vessel classes with DWT + draft + fuel burn |
| `GET` | `/api/routes` | `controllers/getRoutes` | 20 routes with distance, commodity, choke points, seasonal premium |
| `POST` | `/api/forecast` | `controllers/getForecast` | live ML trajectory + 7/14/30-day horizons + P10/P90 |
| `POST` | `/api/optimize` | `controllers/getOptimization` | vessel comparison + cost breakdown + idle risk |
| `GET` | `/api/risk` | `controllers/getRiskAlerts` | 12 active alerts from radar |
| `POST` | `/api/simulate` | `controllers/runSimulation` | factor-by-factor waterfall + delta + simulated rate |
| `POST` | `/api/explain` | `controllers/getExplanation` | **SHAP-lite** top-5 feature contributions per route |

**`/api/forecast` re-anchoring** is the key trick: the ML service returns its own current rate, the Express engine (`server/src/services/forecastingEngine.js`) re-anchors the trajectory to the *displayed* today price so the chart never shows a discontinuity.

**Fallback chain** when ML service is down:
- `fetchMLForecast` returns `null` on 4s timeout × 2 retries.
- Express falls back to `forecastRates(route)` which uses a deterministic seeded random walk + momentum from `historicalRates`.
- The UI displays with a "Reference data" indicator (no error toast).

**`/api/explain` (SHAP-lite)** is a pure-Node endpoint that doesn't call Python. It uses `ml/models/model_metadata.json: top_features` (the importance gains) and a deterministic per-route seed (`routeId.split('').reduce(...charCodeAt)`) to produce stable direction + magnitude per route. The method is documented in the response so judges can see it's a *visualization of LightGBM feature importance* not a full TreeSHAP call.

---

## How the optimizer works

`server/src/services/optimizerEngine.js` runs **for every vessel class** in parallel:

1. **Port feasibility** — `vessel.maxDraft > port.maxDraft` → infeasible. Haldia 8.5 m + Sandheads lighterage auto-adds $5.25/MT + 1 day when vessel is Supramax/Panamax on Haldia.
2. **Voyage cost**:
   ```
   Total = Predicted rate × Cargo MT
         + Sea days × Daily bunker burn × Bunker price
         + Port days × Daily bunker burn × Bunker price
         + Wait days × Demurrage rate
         + Port dues (fixed by port + vessel class)
         + Lighterage cost (if Haldia + vessel draft > 8.5 m)
   ```
3. **Ranking** — sort by **Effective Cost per MT** (Total / Cargo MT) + report **Capacity Utilization %** (cargo MT / vessel DWT, capped at 100% with multi-voyage if over).
4. **Idle / demurrage risk** — `assessIdleRisk(route, vessel)` returns a risk score 0–100 with category (LOW / MED / HIGH) and mitigation strategy.
5. **30-day timing search** — for the selected route, find the optimal day in the next 30 by minimizing `rate × cargo + sea + wait` per day. This is what the Forecaster's booking-window heatmap visualizes.

---

## Data sources

| Source | Path / ticker | Rows | Use |
|---|---|---|---|
| Commodity prices | `commodity_prices_supply_chain.csv` | ~110 k | demand driver |
| Shipping disruptions | `shipping_disruptions.csv` | 2.5 k | congestion + wait days |
| Baltic dry bulk ETF | `BDRY` (Yahoo) | live | market regime |
| WTI crude | `CL=F` (Yahoo) | live | energy cost |
| Brent crude | `BZ=F` (Yahoo) | live | energy cost (East Coast) |
| Star Bulk Carriers | `SBLK` (Yahoo) | live | peer benchmark |
| Genco | `GNK` (Yahoo) | live | peer benchmark |
| Maritime news RSS | gcaptain, splash247 | live | geopolitical radar |
| East Coast ports | `server/src/data/portsData.js` | 9 | feasibility, lighterage |
| Origin ports | same | 7 | route origins |
| Vessel classes | `server/src/data/vesselsData.js` | 5 | DWT, draft, LOA, beam, fuel burn |
| Shipping routes | `server/src/data/routesData.js` | 20 | distance, transit, commodity, choke points, monsoon premium |

---

## Project layout

```
PortCast/
├── client/                          # React 18 + Vite SPA
│   ├── src/
│   │   ├── preview_new/             # Active UI codebase
│   │   │   ├── App.jsx              # Hash router + Bootstrap screen
│   │   │   ├── components/          # AnimatedCard, ScrollReveal, BookingStrip,
│   │   │   │                         MarketTicker, OceanBackground,
│   │   │   │                         FullPageVoyageBackground, ImageMarquee,
│   │   │   │                         RouteMap, FallbackNotice, ErrorBoundary,
│   │   │   │                         ExplainabilityPanel (SHAP-lite)
│   │   │   ├── views/               # Home, Dashboard, FreightForecaster,
│   │   │   │                         CharterOptimizer, PortRestrictions, RiskRadar
│   │   │   ├── data/                # mockData, signal/urgency/severity colors
│   │   │   └── services/            # fetchForecast, fetchRoutes, fetchRisk, …
│   │   └── index.css                # Glass system, beam, marquee, viewEnter keyframes
│   ├── public/frames/               # 140-frame journey video
│   ├── public/keyframes/            # MP4 fallback
│   └── public/img/                  # Maritime stock images
│
├── server/                          # Node.js + Express REST gateway
│   └── src/
│       ├── controllers/portcastController.js   # All 12 endpoints + SHAP-lite
│       ├── routes/api.js            # Router definitions
│       ├── services/
│       │   ├── forecastingEngine.js  # Synthetic fallback (deterministic seeded)
│       │   ├── optimizerEngine.js    # Vessel feasibility + cost + idle risk
│       │   ├── riskEngine.js         # News radar + alert generation
│       │   ├── mlBridgeService.js    # HTTP bridge to ML :8000 with retry
│       │   └── news_radar.py         # Python fallback (also used by ml/service.py)
│       └── data/                     # Domain masters (ports, vessels, routes)
│
├── ml/                              # Python FastAPI ML microservice
│   ├── data_builder.py              # Composite dataset builder
│   ├── train.py                     # LightGBM + XGBoost + Quantile training
│   ├── service.py                   # FastAPI :8000
│   ├── news_radar.py                # RSS chokepoint monitor
│   ├── models/                      # freight_forecasting_bundle.pkl + model_metadata.json
│   └── requirements.txt
│
├── start-all.sh                     # 3-service launcher (creates venv, npm install, retrain)
├── package.json
└── README.md
```

---

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | Express port |
| `ML_SERVICE_URL` | `http://127.0.0.1:8000` | ML service URL (Express → Python) |
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Client API base |
| `JWT_SECRET` | — | Only needed for `/api/users` auth routes |
| `NODE_ENV` | `development` | Controls Express dev tooling |

---

## Tested behaviour

End-to-end tested manually via WebBridge browser automation + subagent vision passes across 22+ iteration cycles:

- `5000:200 · 8000:200 · 5173:200` after `./start-all.sh`.
- `curl /api/ml/health` returns `r2: 0.9943, ensemble: "LightGBM + XGBoost (mean)"`.
- `curl /api/explain {routeId: R01}` returns top-5 driver contributions.
- WebBridge screenshot of all 6 views confirms:
  - `glass-card opacity: 1` (no framer `whileInView` opacity-0 trap).
  - Booking heatmap renders ★ + T line + blue/orange gradient.
  - What-If shock state visually distinct (rose up, emerald down, sky baseline).
  - Pareto chart shows 4 bars, cheapest in emerald.
- WCAG 2.1: hero text reads on ship video, contrast ≥ 4.5:1 on all KPI/trend pills, `prefers-reduced-motion` honored.
- 0 commits, 0 pushes during iteration (work in working tree only).

---

## SIH 2026 alignment

| AGENTS.md § | Promise | Status |
|---|---|---|
| §2.1 — Hybrid Forecasting | LightGBM + XGBoost | ✅ both, hybrid ensemble R² 0.9943 |
| §2.1 — Quantile P10/P90 | Yes | ✅ LightGBM quantile regressors |
| §2.1 — BDRY & macro lags | Yes | ✅ `rate_lag_1/2/3/5/7/14`, `oil_ma_7/14/30`, BDRY live |
| §2.1 — SHAP / explainability | Yes | ✅ `/api/explain` + `<ExplainabilityPanel />` (SHAP-lite) |
| §2.2 — Real-time news NLP | Yes | ✅ `news_radar.py` RSS gcaptain + splash247, severity score |
| §2.2 — Chokepoint entities | 5 listed | ✅ Hormuz, Red Sea/Bab-el-Mandeb, Malacca, Bay of Bengal, Suez |
| §2.2 — Cyclone/weather | Yes | ✅ Bay of Bengal + monsoon seasonal premium |
| §2.2 — Severity multiplier | `1 + score/500` | ✅ applied in `mlBridgeService.js` and Express re-anchor |
| §2.3 — Draft vs DWT filter | Yes | ✅ `vessel.maxDraft > port.maxDraft` |
| §2.3 — Haldia lighterage 8.5m | Yes | ✅ auto-add $5.25/MT + 1 day |
| §2.3 — Voyage cost function | Yes | ✅ hire + bunker + dues + demurrage + lighterage |
| §2.3 — Cost/MT ranking | Yes | ✅ `effectiveCostPerMT` sort |
| §2.3 — 30-day timing search | Yes | ✅ Forecaster heatmap + Best Day chip |
| §2.4 — What-If simulator | Yes | ✅ 3 sliders × live P10/P90 morph + shock banner |
| §2.4 — Route risk map | Yes | ✅ Global Chokepoint Radar SVG + markers |
| §2.4 — Congestion visualizer | Yes | ✅ Port wait days + on-time % + historical disruptions |
| §2.4 — Booking recs + cost breakdown | Yes | ✅ Best Day chip + Cumulative cost Pareto chart |

All 4 engines from the AGENTS.md architecture diagram are live.

---

## Credits

Built for **SIH 2026** (Smart India Hackathon) under problem statement **SIH26006 — Software · Transportation & Logistics**.

- ML: LightGBM (Microsoft), XGBoost (DMLC), scikit-learn, pandas, numpy
- Backend: Node.js, Express, Axios, Cheerio
- Frontend: React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide React
- Data: Yahoo Finance (`yfinance`), gcaptain.com, splash247.com

---

*Predict Freight. Optimize Chartering. Move Cargo Smarter.*
