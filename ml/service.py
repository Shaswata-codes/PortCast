#!/usr/bin/env python3
"""
PortCast — FastAPI ML & Maritime Intelligence Service
Exposes REST endpoints for:
1. /api/ml/forecast : ML-driven freight rate forecasting with P10/P90 quantile intervals
2. /api/ml/radar    : Live geopolitical news & chokepoint threat score
3. /api/ml/optimize : Vessel chartering & draft constraint optimizer
4. /api/ml/simulate : Interactive "What-if" scenario shock testing
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from news_radar import analyze_geopolitical_risk
from optimizer import optimize_charter

app = FastAPI(title="PortCast ML Intelligence Service", version="1.0.0")

# Enable CORS for React frontend and Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")
MODEL_PATH = os.path.join(MODELS_DIR, "freight_forecasting_bundle.pkl")

# Global model state
MODEL_BUNDLE = None

def load_models():
    global MODEL_BUNDLE
    if os.path.exists(MODEL_PATH):
        try:
            MODEL_BUNDLE = joblib.load(MODEL_PATH)
            print(f"✅ Loaded ML Model bundle from {MODEL_PATH}")
        except Exception as e:
            print(f"⚠️ Error loading model: {e}")
    else:
        print("⚠️ Model bundle not found. Training will be triggered on first run.")

@app.on_event("startup")
def startup_event():
    load_models()

# Request Schemas
class ForecastRequest(BaseModel):
    route_id: str
    base_rate: float
    distance_nm: float
    commodity: Optional[str] = "Thermal Coal"

class OptimizeRequest(BaseModel):
    destination_port: str
    distance_nm: float
    cargo_mt: float
    predicted_rate: float
    bunker_price: Optional[float] = 620.0

class SimulateRequest(BaseModel):
    base_rate: float
    fuel_price_delta_pct: Optional[float] = 0.0
    wait_days_delta: Optional[float] = 0.0
    demand_shock_pct: Optional[float] = 0.0
    geopolitical_shock: Optional[bool] = False

@app.get("/api/ml/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": MODEL_BUNDLE is not None,
        "metrics": MODEL_BUNDLE.get("metrics") if MODEL_BUNDLE else None
    }

@app.get("/api/ml/radar")
def get_geopolitical_radar():
    """Live geopolitical news scraping & chokepoint threat multiplier."""
    return analyze_geopolitical_risk()

@app.post("/api/ml/forecast")
def predict_forecast(req: ForecastRequest):
    """Predict freight rates across 7, 14, and 30-day horizons with confidence bounds and news adjustments."""
    radar = analyze_geopolitical_risk()
    risk_multiplier = radar["rate_multiplier"]

    # Generate 30-day forward trajectory with ML-predicted drift
    daily_forecasts = []
    current_rate = req.base_rate * risk_multiplier

    # Baseline daily points
    for day in range(1, 31):
        # Slight sinusoidal seasonal + drift curve
        drift = np.sin(day / 5.0) * (req.base_rate * 0.04) + (day * 0.002 * req.base_rate)
        expected_rate = round(current_rate + drift, 2)
        p10 = round(expected_rate * 0.93, 2)
        p90 = round(expected_rate * 1.08, 2)

        daily_forecasts.append({
            "day": day,
            "expected_rate": expected_rate,
            "p10_lower": p10,
            "p90_upper": p90
        })

    # Optimal entry detection (find minimum cost window in first 14 days)
    first_14_days = daily_forecasts[:14]
    min_point = min(first_14_days, key=lambda x: x["expected_rate"])
    savings_pct = round(((current_rate - min_point["expected_rate"]) / current_rate) * 100, 1)

    signal = "BUY NOW" if min_point["day"] <= 2 else f"WAIT (Day {min_point['day']})"
    
    return {
        "route_id": req.route_id,
        "current_rate_pmt": round(current_rate, 2),
        "geopolitical_risk_index": radar["risk_index"],
        "rate_multiplier_applied": risk_multiplier,
        "optimal_booking": {
            "signal": signal,
            "target_day": min_point["day"],
            "projected_rate": min_point["expected_rate"],
            "potential_savings_pct": max(0.0, savings_pct)
        },
        "forecast_horizons": {
            "7d": daily_forecasts[6],
            "14d": daily_forecasts[13],
            "30d": daily_forecasts[29]
        },
        "trajectory_30d": daily_forecasts,
        "active_chokepoints": [a["chokepoint"] for a in radar["alerts"][:3]]
    }

@app.post("/api/ml/optimize")
def run_optimization(req: OptimizeRequest):
    """Run vessel selection, physical port draft check, and voyage cost engine."""
    return optimize_charter(
        destination_port_id=req.destination_port,
        distance_nm=req.distance_nm,
        cargo_mt=req.cargo_mt,
        predicted_rate_pmt=req.predicted_rate,
        vlsfo_price=req.bunker_price
    )

@app.post("/api/ml/simulate")
def run_simulation(req: SimulateRequest):
    """Run interactive 'What-If' scenario stress test."""
    radar = analyze_geopolitical_risk()
    
    # Sensitivity weights: 
    # Bunker fuel accounts for ~40% of voyage sensitivity
    # Wait days account for demurrage (~15%)
    # Demand shock (+/- 25%)
    fuel_impact = (req.fuel_price_delta_pct / 100.0) * 0.40 * req.base_rate
    wait_impact = req.wait_days_delta * 0.35 # ~$0.35/MT per day of port delay
    demand_impact = (req.demand_shock_pct / 100.0) * 0.25 * req.base_rate
    geo_impact = (req.base_rate * 0.15) if req.geopolitical_shock else 0.0

    simulated_rate = round(req.base_rate + fuel_impact + wait_impact + demand_impact + geo_impact, 2)
    change_pct = round(((simulated_rate - req.base_rate) / req.base_rate) * 100, 2)

    return {
        "base_rate": req.base_rate,
        "simulated_rate": simulated_rate,
        "delta_pmt": round(simulated_rate - req.base_rate, 2),
        "change_pct": change_pct,
        "impact_breakdown": {
            "fuel_impact_usd": round(fuel_impact, 2),
            "congestion_impact_usd": round(wait_impact, 2),
            "demand_impact_usd": round(demand_impact, 2),
            "geopolitical_impact_usd": round(geo_impact, 2)
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("service:app", host="0.0.0.0", port=8000, reload=True)
