# AGENTS.md — PortCast Architecture & Intelligence Blueprint

> **SIH 2026 Problem Statement:** SIH26006 | Software / Transportation & Logistics  
> **Mission:** *Predict Freight. Optimize Chartering. Move Cargo Smarter.* 🚢

---

## 1. Executive Summary & Vision

**PortCast** is an AI-powered maritime intelligence platform designed to forecast freight rates, analyze port infrastructure constraints, assess geopolitical/weather disruptions in real time, and recommend optimal vessel chartering and bulk cargo procurement strategies specifically tailored for the **East Coast of India** (Paradip, Visakhapatnam, Haldia, Dhamra, Ennore, Krishnapatnam, Tuticorin).

---

## 2. Innovative System Capabilities & Winning Features

To stand out in SIH26006, PortCast integrates four core intelligence engines:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PORTCAST PLATFORM                                    │
├──────────────────────────┬───────────────────────────┬─────────────────────────────────┤
│   1. HYBRID ML FORECAST  │   2. GEOPOLITICAL RADAR   │     3. CHARTER OPTIMIZER        │
│   • LightGBM / XGBoost   │   • Real-Time News Radar  │   • Port Draft vs DWT Filter    │
│   • Quantile Bounds      │   • Choke Point Risk (NLP)│   • Fuel Burn & Voyage Matrix   │
│   • BDRY & Macro Lags    │   • Cyclone / Weather Risk│   • Multi-Window Timing Search  │
└──────────────────────────┴───────────────────────────┴─────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                4. DECISION CO-PILOT UI                                 │
│   • Interactive Scenario Simulator (What-If Analysis)                                 │
│   • Route Risk Map & Port Congestion Visualizer                                       │
│   • Actionable Booking Recommendations & Cost Breakdown                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Key Differentiators:
1. **Hybrid Forecasting (Time-Series ML + Real-Time NLP Shock Factor):**
   * Combines fundamental statistical time-series models (historical rates, commodity demand, fuel prices) with live web-scraped geopolitical news (e.g., Strait of Hormuz conflict, Red Sea disruptions, cyclone warnings in the Bay of Bengal).
2. **Physical Port Feasibility Engine:**
   * Enforces realistic physical constraints: tidal windows, Sandheads lighterage barge requirements at Haldia (8.5m draft), night navigation restrictions, and berth wait days.
3. **Multi-Window Charter Timing Optimization:**
   * Analyzes the next 30-day forecast horizon to identify optimal booking troughs, quantifying exact dollar savings (e.g., *"Delay booking by 4 days to save $42,000 before monsoon surge"*).
4. **"What-If" Scenario Simulator:**
   * Allows supply chain managers to simulate shocks: *"What happens to freight cost if Brent crude rises by 15%?"* or *"What if Vizag wait time increases by 3 days?"*

---

## 3. Data Architecture & Pipeline

### A. Raw Data Sources
1. **Macro & Commodity Prices (`commodity_prices_supply_chain.csv`):**
   * 110,000+ daily data points (Brent Crude, Coal, Iron Ore, Copper, Aluminum, Fertilizer).
2. **Global Disruption & Congestion (`shipping_disruptions.csv`):**
   * Port waiting times, historical disruption indexes, fuel price indices, and on-time percentages.
3. **Live Dry Bulk Market Feeds (Automated Python Script):**
   * `BDRY` (Breakwave Dry Bulk Shipping ETF tracking Baltic Capesize, Panamax & Supramax futures).
   * Energy futures (`CL=F`, `BZ=F`, Marine Gas Oil).
4. **Domain Masters (`server/src/data/`):**
   * East Coast Indian Ports specs (Paradip, Vizag, Haldia, Dhamra, Ennore, etc.).
   * Global origin ports (Newcastle, Hay Point, Richards Bay, Tanjung Priok, Dampier).
   * Vessel fleet specs (Handysize, Supramax, Panamax, Capesize DWT, draft, fuel burn rates).

### B. Feature Engineering
* **Temporal Lags:** 7-day, 14-day, and 30-day rolling averages and price momentum.
* **Energy Sensitivity:** Fuel-to-commodity price ratio, bunker consumption per nautical mile.
* **Seasonality Factors:** Southwest Monsoon (June–Sept) & Northeast Monsoon (Oct–Dec) premium weights on the Bay of Bengal.
* **Disruption Sentiment Multiplier:** NLP severity score parsed from live maritime news feeds.

---

## 4. Machine Learning & Forecasting Core

### Models & Objectives
* **Primary Regressor:** **LightGBM / XGBoost Regressor** for point forecast of freight rate ($/MT or $/day).
* **Uncertainty Quantification:** **Quantile Regression (Loss = Quantile, $\alpha = 0.10, 0.50, 0.90$)** to output statistical risk bands (P10 lower bound, P50 expected rate, P90 shock upper bound).
* **Explainability (SHAP / Feature Importance):** Decomposes forecast into driving factors (e.g., +40% Fuel Price, +30% Port Congestion, +20% Commodity Demand, +10% Weather).

---

## 5. Real-Time Geopolitical & News Radar (NLP Engine)

### Workflow
1. **Live Aggregation:** Scrapes/fetches maritime and supply chain alerts from maritime feeds, RSS, and news APIs.
2. **Entity & Sentiment Extraction:**
   * Identifies targeted chokepoints: *Strait of Hormuz, Bab-el-Mandeb (Red Sea), Malacca Strait, Suez Canal, Bay of Bengal*.
   * Detects event types: *Armed Conflict, Piracy, Canal Blockage/Drought, Cyclone/Severe Weather, Port Strike*.
3. **Disruption Severity Scoring:**
   $$\text{Risk Multiplier} = 1.0 + (\text{Severity Score} \times \text{Route Vulnerability})$$
4. **Dynamic Adjustment:** Modifies the baseline ML point forecast and expands the P90 uncertainty bound accordingly.

---

## 6. Vessel Chartering & Cost Optimization Algorithm

For a given cargo shipment request $(\text{Origin}, \text{Destination Port}, \text{Cargo Type}, \text{Volume in MT}, \text{Target Date})$:

1. **Port Constraint Validation:**
   $$\text{Vessel Draft} \le \text{Port Maximum Permissible Draft}$$
   * If exceeded, mark vessel class as **Infeasible** (or trigger lighterage cost calculation if lighterage is available, e.g., Haldia Sandheads).
2. **Voyage Cost Function:**
   $$\text{Total Cost} = (\text{Predicted Freight Rate} \times \text{Cargo MT}) + (\text{Days at Sea} \times \text{Daily Fuel Burn} \times \text{Bunker Price}) + (\text{Wait Days} \times \text{Demurrage Rate}) + \text{Port Dues}$$
3. **Recommendation Ranking:**
   * Ranks viable vessels by **Effective Cost per MT** and **Capacity Utilization %**.
4. **Optimal Timing Search:**
   * Evaluates cost function across a 30-day window to recommend the most cost-effective booking window.

---

## 7. Technology Stack & Directory Blueprint

```
PortCast/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/         # Forecast charts, vessel cards, risk radar widgets
│   │   ├── pages/              # Dashboard, Optimizer, Route Analytics, Simulator
│   │   ├── services/           # API clients connecting to backend
│   │   └── context/            # Global state management
├── server/                     # Node.js + Express REST API Gateway
│   ├── src/
│   │   ├── controllers/        # Request handlers (forecast, charter, simulation)
│   │   ├── data/               # Port, vessel, and route domain master files
│   │   ├── services/           # Business logic & bridge to ML service
│   │   └── routes/             # API route definitions
├── ml/                         # Python ML & Intelligence Engine
│   ├── data/                   # Processed datasets and live feeds
│   ├── models/                 # Serialized LightGBM/XGBoost models (.pkl/.joblib)
│   ├── data_builder.py         # Ingestion, Yahoo Finance fetcher, feature engineering
│   ├── train.py                # Model training, cross-validation & evaluation
│   ├── news_radar.py           # Real-time maritime news scraper & NLP impact scorer
│   ├── optimizer.py            # Vessel selection, draft check & cost minimization
│   └── service.py              # FastAPI microservice exposing ML endpoints
├── datasets/                   # Historical data repository (raw CSVs + benchmarks)
├── AGENTS.md                   # This project guide & specification
└── README.md                   # Project overview & quickstart
```

---

## 8. Development Roadmap

- [ ] **Phase 1: ML Engine & Ingestion**
  - Set up `ml/` Python environment with `lightgbm`, `pandas`, `fastapi`, `yfinance`.
  - Build `data_builder.py` to merge real commodity data, disruptions, and dry bulk futures (`BDRY`).
  - Train point and quantile forecasting models in `train.py`.
- [ ] **Phase 2: Real-Time News Radar & Optimizer**
  - Implement `news_radar.py` for live chokepoint threat detection.
  - Implement `optimizer.py` for port draft feasibility and total voyage cost ranking.
  - Expose endpoints via FastAPI in `service.py`.
- [ ] **Phase 3: Backend & Frontend Integration**
  - Connect Node.js server routes to FastAPI endpoints.
  - Build UI dashboards: Forecast Graph with P10/P90 bands, Vessel Comparison cards, Interactive "What-If" Slider, and Live Geopolitical Risk Map.
