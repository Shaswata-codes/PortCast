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
import threading
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from news_radar import analyze_geopolitical_risk
from optimizer import optimize_charter

@asynccontextmanager
async def lifespan(_app):
    load_models()

    def _warm():
        try:
            get_geopolitical_radar()
            print("[ml] radar cache warmed")
        except Exception as e:
            print(f"[ml] radar warmup skipped: {e}")

    threading.Thread(target=_warm, daemon=True).start()
    yield


app = FastAPI(
    title="PortCast ML Intelligence Service",
    version="1.0.0",
    lifespan=lifespan,
)

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
DATA_PATH = os.path.join(BASE_DIR, "ml", "data", "processed_freight_master.csv")
MODEL_PATH = os.path.join(MODELS_DIR, "freight_forecasting_bundle.pkl")

# Global model state
MODEL_BUNDLE = None
RATE_HISTORY = []
HORIZON_WINDOW = 45

def load_models():
    global MODEL_BUNDLE, RATE_HISTORY
    if os.path.exists(MODEL_PATH):
        try:
            MODEL_BUNDLE = joblib.load(MODEL_PATH)
            print(f"[ml] Loaded model bundle from {MODEL_PATH}")
        except Exception as e:
            print(f"[ml] Error loading model: {e}")
    else:
        print("[ml] Model bundle not found.")
    if os.path.exists(DATA_PATH):
        try:
            df = pd.read_csv(DATA_PATH, usecols=["target_rate"]).dropna()
            RATE_HISTORY = df["target_rate"].astype(float).tolist()[-HORIZON_WINDOW:]
            print(f"[ml] Rate history loaded: {len(RATE_HISTORY)} points")
        except Exception as e:
            print(f"[ml] Rate history unavailable: {e}")


def _roll(hist, win, kind):
    seg = np.asarray(hist[-win:], dtype=float)
    if kind == "ma":
        return float(seg.mean())
    if kind == "std":
        return float(seg.std())
    return float((seg[-1] - seg.mean()) / max(abs(seg.mean()), 1e-9))


def _predict_point(bundle, X):
    point_prediction = bundle["point_model"].predict(X)
    xgb_model = bundle.get("xgb_model")
    if xgb_model is not None:
        point_prediction = (point_prediction + xgb_model.predict(X)) / 2.0
    return point_prediction

def _recursive_trajectory(days=30):
    """Recursive multi-step LightGBM forecast on the trained feature space."""
    bundle = MODEL_BUNDLE
    if not bundle or len(RATE_HISTORY) < 31:
        return None
    try:
        feats = bundle["feature_cols"]
        cols = set(feats)
        hist = list(RATE_HISTORY)
        anchor = hist[-1]
        out = []
        base_feats = {k: v for k, v in bundle["latest_features"].items() if k in cols}
        today = pd.Timestamp.utcnow().tz_localize(None).normalize()
        for day in range(1, days + 1):
            d = today + pd.Timedelta(days=day)
            row = dict(base_feats)
            row["bdry_close"] = hist[-1]
            row["rate_ma_7"] = _roll(hist, 7, "ma")
            row["rate_std_7"] = _roll(hist, 7, "std")
            row["rate_momentum_7"] = _roll(hist, 7, "mom")
            row["rate_ma_14"] = _roll(hist, 14, "ma")
            row["rate_std_14"] = _roll(hist, 14, "std")
            row["rate_momentum_14"] = _roll(hist, 14, "mom")
            row["rate_ma_30"] = _roll(hist, 30, "ma")
            row["rate_std_30"] = _roll(hist, 30, "std")
            row["rate_momentum_30"] = _roll(hist, 30, "mom")
            m, q = d.month, d.quarter
            row["month"], row["quarter"], row["day_of_year"] = m, q, d.dayofyear
            row["is_sw_monsoon"] = int(5 <= m <= 8)
            row["is_cyclone_season"] = int(9 <= m <= 11)
            X = pd.DataFrame([[row.get(c, 0.0) for c in feats]], columns=feats)
            pt = float(_predict_point(bundle, X)[0])
            lo = float(bundle["p10_model"].predict(X)[0])
            hi = float(bundle["p90_model"].predict(X)[0])
            hist.append(pt)
            out.append({"day": day, "point": pt, "p10": lo, "p90": hi, "anchor": anchor})
        return out
    except Exception as e:
        print(f"[ml] Recursive inference failed: {e}")
        return None

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

_RADAR_CACHE = {"ts": 0.0, "data": None, "refreshing": False}

def _refresh_radar_async():
    import threading, time
    def _run():
        if _RADAR_CACHE["refreshing"]:
            return
        _RADAR_CACHE["refreshing"] = True
        try:
            data = analyze_geopolitical_risk()
            _RADAR_CACHE["data"] = data
            _RADAR_CACHE["ts"] = time.time()
        except Exception:
            pass
        finally:
            _RADAR_CACHE["refreshing"] = False
    threading.Thread(target=_run, daemon=True).start()

@app.get("/api/ml/radar")
def get_geopolitical_radar():
    """Chokepoint threat multiplier — serves stale cache instantly, refreshes in background."""
    import time
    now = time.time()
    if _RADAR_CACHE["data"] is None:
        _RADAR_CACHE["data"] = analyze_geopolitical_risk()
        _RADAR_CACHE["ts"] = now
    elif now - _RADAR_CACHE["ts"] > 60:
        _refresh_radar_async()
    return _RADAR_CACHE["data"]

@app.post("/api/ml/forecast")
def predict_forecast(req: ForecastRequest):
    """Predict freight rates across 7, 14, and 30-day horizons with confidence bounds and news adjustments."""
    radar = get_geopolitical_radar()
    risk_multiplier = radar["rate_multiplier"]
    current_rate = req.base_rate * risk_multiplier

    traj_ml = _recursive_trajectory(30)
    daily_forecasts = []
    if traj_ml:
        anchor = traj_ml[0]["anchor"]
        for step in traj_ml:
            r_pt = step["point"] / anchor
            r_lo = min(step["p10"], step["point"]) / anchor
            r_hi = max(step["p90"], step["point"]) / anchor
            r_lo = float(np.clip(r_lo, 0.82, 1.0))
            r_hi = float(np.clip(r_hi, 1.01, 1.28))
            expected_rate = round(current_rate * r_pt, 2)
            daily_forecasts.append({
                "day": step["day"],
                "expected_rate": expected_rate,
                "p10_lower": round(current_rate * r_lo, 2),
                "p90_upper": round(current_rate * r_hi, 2),
            })
        engine = "lightgbm_recursive_v1"
    else:
        for day in range(1, 31):
            drift = np.sin(day / 5.0) * (req.base_rate * 0.04) + (day * 0.002 * req.base_rate)
            expected_rate = round(current_rate + drift, 2)
            daily_forecasts.append({
                "day": day,
                "expected_rate": expected_rate,
                "p10_lower": round(expected_rate * 0.93, 2),
                "p90_upper": round(expected_rate * 1.08, 2),
            })
        engine = "fallback_sinusoid"

    # Optimal entry detection (find minimum cost window in first 14 days)
    first_14_days = daily_forecasts[:14]
    min_point = min(first_14_days, key=lambda x: x["expected_rate"])
    savings_pct = round(((current_rate - min_point["expected_rate"]) / current_rate) * 100, 1)

    signal = "BUY NOW" if min_point["day"] <= 2 else f"WAIT (Day {min_point['day']})"
    
    return {
        "route_id": req.route_id,
        "engine": engine,
        "model_metrics": MODEL_BUNDLE["metrics"] if MODEL_BUNDLE else None,
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
    radar = get_geopolitical_radar()
    
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
