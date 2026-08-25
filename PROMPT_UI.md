# 🎨 Expert UI/UX Design & Frontend Prompt: PortCast (SIH 2026)

> **Instructions for the Expert Frontend Designer / AI UI Architect:**
> You are tasked with designing a breathtaking, modern, high-converting enterprise dashboard UI for **PortCast** — an AI-powered Maritime Intelligence & Freight Rate Forecasting Platform competing in the **Smart India Hackathon (SIH 2026)** under Problem Statement **SIH26006**.
> 
> The UI must look like a multi-million-dollar maritime terminal operating system (think *Bloomberg Terminal meets Palantir Foundry meets Linear.app*). It must feel crisp, dark-mode first, ultra-responsive, and rich in data visualization without feeling cluttered.

---

## 1. Product Context & Personas
* **Product Name:** PortCast
* **Mission:** *Predict Freight. Optimize Chartering. Move Cargo Smarter.* 🚢
* **Target Users:** Bulk Cargo Procurement Heads, Fleet Chartering Managers, Port Logistics Coordinators managing shipments to the **East Coast of India** (Paradip, Visakhapatnam, Haldia, Dhamra, Ennore, Gangavaram, Tuticorin).
* **Primary Commodities:** Thermal Coal, Coking Coal, Iron Ore, Bauxite, Fertilizer, Limestone.

---

## 2. Design System & Aesthetics
* **Theme:** Deep Maritime Midnight (Dark Mode First)
  * Background: Deep Navy/Obsidian (`#060d19`, `#0a1628`, `#0f213e`)
  * Accent Colors:
    * **Cyan / Electric Aqua (`#06b6d4`, `#22d3ee`):** AI intelligence, freight rates, live indicators
    * **Maritime Royal Blue (`#3b82f6`):** Navigation, primary buttons, vessel tracks
    * **Emerald Green (`#10b981`):** Savings, bullish signals, buy/lock recommendations, feasible ports
    * **Amber / Gold (`#f59e0b`):** Warning flags, P10/P90 confidence boundaries, medium urgency
    * **Rose / Crimson (`#f43f5e`):** Infeasible draft restrictions, active chokepoints, high risk alerts
  * Card Style: Subtle translucent glassmorphism (`backdrop-blur-md`, `border border-cyan-500/10`, `box-shadow-2xl`)
  * Typography: Inter / Plus Jakarta Sans for UI text, JetBrains Mono / Fira Code for financial numbers and coordinates.

---

## 3. Core Pages & Component Layouts to Design

### A. Navigation & Top Global Market Bar
* **Top Market Ticker:** Live real-time streaming strip showing:
  * **BDI (Baltic Dry Index)** (+1.2%), **BCI (Capesize)**, **BPI (Panamax)**, **BSI (Supramax)**
  * **VLSFO Bunker Fuel ($587.20/MT)**, **MGO ($848.50/MT)**
  * **Live Geopolitical Risk Level Badge:** `Risk Index 51.1/100 (x1.102 Shock Multiplier)`
* **Sidebar / Topbar Tabs:**
  1. 📊 **Overview Dashboard**
  2. 📈 **Freight Rate Forecaster (Multi-Horizon ML)**
  3. 🎯 **Chartering Optimizer (Draft & Fuel Engine)**
  4. ⚓ **Port Restrictions & Lighterage Radar**
  5. ⚡ **Risk Radar & What-If Stress Simulator**

---

### B. Page 1: Overview Dashboard (`Dashboard.jsx`)
* **KPI Row:**
  * Active Monitored Routes (20 global routes)
  * Average Spot Freight Rate ($/MT)
  * 30-Day Rate Momentum Indicator (Bullish/Bearish with micro sparkline)
  * Live Active Risk Alerts Count
* **Main Visuals:**
  * **Interactive Route Snapshot Matrix:** Quick table showing Origin -> Destination, Commodity, Current Rate, 7-Day Forecast, Direction (🔼/🔽), and Booking Urgency (`LOCK NOW` vs `WAIT`).
  * **Interactive East Coast Indian Ports Map / Status Grid:** Visualizing berthing waiting days and draft status at Paradip, Vizag, Haldia, Dhamra, Ennore.
  * **Live Maritime News Shock Feed:** Real-time scraped alert cards (e.g. *Strait of Hormuz Alert*, *Malacca Piracy Warning*, *Bay of Bengal Pre-Monsoon Advisory*).

---

### C. Page 2: Freight Rate Forecaster (`FreightForecaster.jsx`)
* **Route Selector Dropdown & Filter Bar:** Select Origin (e.g., Newcastle AU, Taboneo ID, Richards Bay SA) and Destination (e.g., Paradip, Vizag, Haldia).
* **Live ML Intelligence Callout Banner:**
  * Displays: *Model: LightGBM Regressor ($R^2 = 0.9997$)*
  * Quantile Bands: P10 Lower Bound ($13.43) / P90 Upper Shock Bound ($15.60)
  * Optimal Booking Window Recommendation: *"Book Day 1 — Save up to $9.66/MT before projected surge"*
* **Interactive Multi-Horizon Chart (Chart.js / Recharts):**
  * Historical 180-day spot rates (Cyan line)
  * 30-Day Forward Forecast (Gold dashed line)
  * 80% / 90% Confidence Interval Shaded Cone (Translucent Gold fill)
* **Spot vs Time Charter (TC) & COA Comparison Matrix:**
  * Clear comparison card showing Spot Rate vs 6-Month TC vs 12-Month TC vs Contract of Affreightment (COA).

---

### D. Page 3: Chartering Optimizer (`CharterOptimizer.jsx`)
* **Input Panel:**
  * Cargo Parcel Size slider/input (e.g., 75,000 MT)
  * VLSFO Bunker Fuel Price input (default: $620/MT)
* **Vessel Class Comparison Cards (Grid View):**
  * Four comparative cards for **Handysize (35k DWT)**, **Supramax (58k DWT)**, **Panamax (76k DWT)**, and **Capesize (180k DWT)**.
  * Each card shows:
    * **Feasibility Badge:** `FEASIBLE` (Green) or `INFEASIBLE: DRAFT 18.5m > 14.5m` (Red) or `LIGHTERAGE REQUIRED` (Haldia Sandheads barge transfer)
    * Capacity Utilization % (e.g. 98.7% with progress bar)
    * Sea Days vs Port Days breakdown
    * **Total Voyage Cost Breakdown:** Freight Cost + Bunker Fuel Cost + Port Dues + Demurrage + Lighterage
    * **Effective Cost Per MT:** Highlighted in bold monospace.
  * **Optimal Recommendation Badge:** Glow ring on the most cost-effective vessel.

---

### E. Page 4: Risk Radar & What-If Stress Simulator (`RiskRadar.jsx`)
* **Live Geopolitical & Weather Risk Feed:**
  * Severity pills (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`)
  * Target chokepoint badges (`Strait of Hormuz`, `Malacca Strait`, `Red Sea`, `Bay of Bengal`)
* **Interactive "What-If" Sensitivity Simulator:**
  * Interactive Sliders:
    * 🛢️ **Bunker Fuel Shock:** $-30\%$ to $+50\%$
    * ⏱️ **Port Congestion Waiting Days:** $+0$ to $+10$ days
    * 📦 **Global Commodity Demand Shift:** $-25\%$ to $+25\%$
    * 🌪️ **Bay of Bengal Cyclone / Monsoon Surge Toggle:** ON / OFF
    * ⛔ **Chokepoint Closure Simulation:** (e.g. Hormuz Blockage / Red Sea Diversion)
  * **Live Impact Card:** Instantly calculates the new recalculated freight rate ($/MT) and displays the dollar delta ($+\$3.45/\text{MT}$) and waterfall breakdown.

---

## 4. Deliverables Expected from the Expert Designer
1. **Polished React + Tailwind / CSS Components:** Clean JSX code with modular component structure.
2. **Smooth Micro-Interactions:** Hover glows, subtle badge pulse animations for live alerts, crisp tooltips for charts.
3. **Responsive Grid:** Flawless rendering across 4K displays, 1080p laptops, and tablet screens.
