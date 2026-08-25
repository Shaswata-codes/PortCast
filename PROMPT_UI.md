# Frontend UI Architecture & Component Specification: PortCast

> **Task for the Senior UI/UX Architect & Frontend Engineer:**
> You have full creative and architectural freedom over the visual design system, color palette, layout hierarchy, and styling approach (Tailwind, CSS Modules, Radix UI, Shadcn, or custom CSS). 
> 
> Your objective is to build a top-tier, production-grade enterprise dashboard for **PortCast** (a maritime freight intelligence and vessel chartering optimization platform built for Smart India Hackathon — SIH26006). 
> 
> **Key Constraint:** Maintain a serious, high-end enterprise aesthetic. Do NOT use emojis in UI titles, labels, or buttons — use clean SVG icons (e.g., Lucide React).

---

## 1. System Overview & Data Flow
* **Frontend Tech:** React (Vite)
* **Backend API Gateway:** Express.js REST API (`http://localhost:5000/api`)
* **ML Microservice:** FastAPI (`http://localhost:8000/api/ml`)
* **Target Audience:** Procurement Directors, Vessel Chartering Brokers, Port Operations Heads managing bulk cargo (Coal, Iron Ore, Bauxite, Fertilizer) arriving at India's East Coast (Paradip, Visakhapatnam, Haldia, Dhamra, Ennore).

---

## 2. Core Functional Components & Views to Build

### 1. Global Navigation & Real-Time Market Ticker (`Navbar.jsx`, `MarketTicker.jsx`)
* **Top Market Strip:** Real-time financial ticker displaying:
  * Baltic Dry Indices: BDI, BCI (Capesize), BPI (Panamax), BSI (Supramax) with percentage change.
  * Bunker Fuel Prices: VLSFO ($/MT), MGO ($/MT).
  * System Live Status & Current Geopolitical Threat Multiplier (e.g., `Risk Index: 51.1/100 | Multiplier: x1.102`).
* **Navigation Bar:** Tab navigation between the 5 primary views.

### 2. View 1: Executive Market Overview (`Dashboard.jsx`)
* **KPI Metric Grid:**
  * Active Monitored Shipping Routes
  * Average Spot Freight Rate ($/MT)
  * 30-Day Rate Momentum (Bullish/Bearish)
  * Active Risk Alerts Count
* **Key Route Projections & Signals Table:**
  * Origin Terminal → Destination Port
  * Commodity Type
  * Current Spot Rate ($/MT)
  * 7-Day & 30-Day Forward Forecasts
  * Direction Indicator (Rising / Falling)
  * Recommendation Signal (`LOCK NOW`, `BUY NOW`, `WAIT`)
* **East Coast Port Status & Waiting Time Grid:**
  * Real-time berthing wait days and capacity status for Paradip, Vizag, Haldia, Dhamra, Ennore.
* **Live Maritime Disruption Feed:**
  * Real-time scraped alert cards covering critical chokepoints (Strait of Hormuz, Malacca Strait, Bab-el-Mandeb / Red Sea, Bay of Bengal).

### 3. View 2: Multi-Horizon Freight Rate Forecaster (`FreightForecaster.jsx`)
* **Interactive Route Selector:** Select route (Origin Port → Destination Port + Commodity).
* **Live ML Intelligence Callout Card:**
  * Model Type: LightGBM Regressor ($R^2 = 0.9997$)
  * Statistical Confidence Intervals: P10 Lower Bound / P90 Upper Shock Bound
  * Optimal Booking Target Day & Projected Rate ($/MT)
  * Active Monitored Chokepoints
* **Multi-Horizon Time-Series Chart:**
  * 180-day historical spot rates
  * 30-day forward predictive trajectory
  * Shaded confidence interval band
* **Optimal Market Entry Recommendation Card:**
  * Entry Signal Badge (`LOCK NOW` / `BUY NOW` / `WAIT`)
  * Urgency Level (`HIGH` / `MEDIUM` / `LOW`)
  * Projected Trough vs Peak Rate & Day Window
* **Spot vs Time Charter (TC) & COA Comparison Matrix:**
  * Comparison table: Spot Rate vs 6-Month TC vs 12-Month TC vs Contract of Affreightment (COA).
* **Model Performance Metrics Panel:**
  * MAPE, RMSE, R², Directional Accuracy, Baltic Correlation.

### 4. View 3: Intelligent Chartering Optimizer (`CharterOptimizer.jsx`)
* **Parameter Input Panel:**
  * Shipping Route selector
  * Cargo Parcel Size (MT) (e.g., 75,000 MT)
  * Bunker Fuel Price ($/MT) (VLSFO)
* **Vessel Class Feasibility & Cost Evaluation Cards:**
  * Comparative cards for **Handysize (35k DWT)**, **Supramax (58k DWT)**, **Panamax (76k DWT)**, and **Capesize (180k DWT)**.
  * Each card must display:
    * Feasibility Compliance: `Feasible`, `Restricted` (Draft/LOA exceeded), or `Lighterage Required` (e.g. Haldia Sandheads anchorage barge transfer).
    * Capacity Utilization Percentage
    * Sea Days vs Port Days Breakdown
    * Comprehensive Cost Breakdown: Freight Cost, Bunker Fuel Cost, Port Dues, Demurrage Liability, Lighterage Cost, and Total Voyage Cost.
    * Effective Cost Per Metric Ton ($/MT).
* **Laycan Timing & Idle Risk Advisory:**
  * Recommended laycan fixture window
  * Port Demurrage Risk Level & Despatch Earnings Potential
  * Concrete mitigation strategies.

### 5. View 4: Port Infrastructure & Fleet Compatibility Matrix (`PortRestrictions.jsx`)
* **Master Compliance Matrix:**
  * Destination Port Specifications: Max Permissible Draft (m), Max LOA (m), Beam, Dry Bulk Berths, Discharge Rate (MT/day), Waiting Days.
  * Vessel Compatibility Badges across all 4 vessel classes for each port.
* **Terminal Operational Cards:**
  * Night Navigation constraints, tidal range, lighterage requirements, and handled commodities.

### 6. View 5: Risk Radar & What-If Stress Simulator (`RiskRadar.jsx`)
* **Active Disruption & Geopolitical Alerts Feed:**
  * Severity Badges (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`)
  * Affected Routes & Impact Summaries.
* **Interactive Scenario Stress-Test Simulator:**
  * Sliders / Inputs for:
    * Bunker Fuel Price Shock ($-50\%$ to $+100\%$)
    * Port Delay / Congestion ($0$ to $15$ extra days)
    * Commodity Demand Shift ($-30\%$ to $+50\%$)
    * Cyclone / Monsoon Season Disruption Days
    * Chokepoint Closure Simulation (Suez / Malacca / Hormuz)
  * **Simulation Output Display:**
    * Recalculated Freight Rate ($/MT)
    * Delta vs Base Rate ($+\Delta/MT$) and Percentage Shift
    * Factor-by-factor sensitivity waterfall breakdown (Fuel impact, Demurrage impact, Demand shock, Geopolitical surcharge).

---

## 3. What You Should Deliver
1. Choose the optimal layout, typography, data visualization charts, and styling framework you deem best for an enterprise terminal interface.
2. Provide clean, modular React JSX components that wire directly into the existing API endpoints (`/api/dashboard`, `/api/forecast`, `/api/optimize`, `/api/risk`, `/api/simulate`).
