#!/usr/bin/env python3
"""
test_portcast_ml.py — Accuracy evaluation + API test suite for the PortCast ML service.

Two ways to use this file:

1. As a pytest suite (CI / pre-demo sanity check):
       pytest test_portcast_ml.py -v

2. As a standalone accuracy report (for the SIH demo/judging):
       python test_portcast_ml.py --report

Assumptions (adjust the constants below if your layout differs):
- This file lives next to `service.py` (same directory as BASE_DIR expects
  `ml/models/freight_forecasting_bundle.pkl` and
  `ml/data/processed_freight_master.csv` one level up).
- The saved bundle is a dict with keys: "point_model", "p10_model",
  "p90_model", "feature_cols", "latest_features", "metrics" — matching
  what `service.py`'s `load_models()` expects.
- The processed dataset has a `target_rate` column (used as ground truth)
  plus columns matching `feature_cols` in the bundle.
"""

import os
import sys
import argparse

import joblib
import numpy as np
import pandas as pd
import pytest
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# --------------------------------------------------------------------------
# Paths — mirrors service.py's BASE_DIR / MODELS_DIR / DATA_PATH logic
# --------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_PATH = os.path.join(BASE_DIR, "data", "processed_freight_master.csv")
MODEL_PATH = os.path.join(MODELS_DIR, "freight_forecasting_bundle.pkl")

# Accuracy gates — tune these once you know your real model's baseline.
# These exist so pytest FAILS loudly if a retrain silently makes things worse.
MAX_MAE_PMT = 5.0          # max acceptable $/MT mean absolute error for point model
MIN_R2 = 0.80              # minimum acceptable R² for point model
MIN_QUANTILE_COVERAGE = 0.60   # P10-P90 band should contain the true value at least this often
MAX_QUANTILE_COVERAGE = 0.95   # ...but if it's *always* inside the band, the interval is too wide to be useful


# --------------------------------------------------------------------------
# Shared fixtures
# --------------------------------------------------------------------------
@pytest.fixture(scope="module")
def bundle():
    if not os.path.exists(MODEL_PATH):
        pytest.skip(f"Model bundle not found at {MODEL_PATH} — train the model first.")
    return joblib.load(MODEL_PATH)


@pytest.fixture(scope="module")
def dataset():
    if not os.path.exists(DATA_PATH):
        pytest.skip(f"Dataset not found at {DATA_PATH}.")
    return pd.read_csv(DATA_PATH)


@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient against the real service app (models loaded from disk)."""
    from fastapi.testclient import TestClient
    from service import app
    with TestClient(app) as c:
        yield c


def _feature_frame(bundle, df):
    """Recreate training-time causal lag columns before model evaluation."""
    df = df.copy()
    for lag in (1, 2, 3, 5, 7, 14):
        df[f"rate_lag_{lag}"] = df["target_rate"].shift(lag)
    feats = bundle["feature_cols"]
    missing = [c for c in feats if c not in df.columns]
    if missing:
        pytest.skip(f"Dataset is missing feature columns the model expects: {missing}")
    return df.dropna(subset=feats + ["target_rate"])


# --------------------------------------------------------------------------
# Part 1 — Model accuracy tests (backtest against held-out rows)
# --------------------------------------------------------------------------

def _backtest(bundle, df, n_holdout=0.2, seed=42):
    """
    Runs the point/p10/p90 models against a held-out slice of the dataset
    and returns predictions + ground truth for scoring.

    NOTE: this is a simple random holdout, not a walk-forward time-series
    split. For a rate-forecasting model that will eventually matter (you
    don't want to "predict the past" using rows that are chronologically
    after it) — see the --report block below for a walk-forward variant.
    """
    feats = bundle["feature_cols"]
    df = _feature_frame(bundle, df)
    rng = np.random.RandomState(seed)
    idx = rng.permutation(len(df))
    n_test = max(1, int(len(df) * n_holdout))
    test_idx = idx[:n_test]
    test_df = df.iloc[test_idx]

    X = test_df[feats]
    y_true = test_df["target_rate"].values
    y_point = bundle["point_model"].predict(X)
    y_p10 = bundle["p10_model"].predict(X)
    y_p90 = bundle["p90_model"].predict(X)
    return y_true, y_point, y_p10, y_p90


def test_point_model_mae(bundle, dataset):
    y_true, y_point, _, _ = _backtest(bundle, dataset)
    mae = mean_absolute_error(y_true, y_point)
    assert mae <= MAX_MAE_PMT, (
        f"Point model MAE {mae:.2f} exceeds the {MAX_MAE_PMT} $/MT gate — "
        "model has degraded or the gate needs recalibrating."
    )


def test_point_model_r2(bundle, dataset):
    y_true, y_point, _, _ = _backtest(bundle, dataset)
    r2 = r2_score(y_true, y_point)
    assert r2 >= MIN_R2, f"Point model R² {r2:.3f} is below the {MIN_R2} gate."


def test_quantile_models_are_ordered(bundle, dataset):
    """P10 predictions should never exceed P90 predictions for the same row."""
    _, _, y_p10, y_p90 = _backtest(bundle, dataset)
    violations = (y_p10 > y_p90).sum()
    assert violations == 0, (
        f"{violations} rows have P10 > P90 — quantile crossing indicates a "
        "training or calibration bug in the p10/p90 models."
    )


def test_quantile_coverage(bundle, dataset):
    """
    The true rate should fall inside [P10, P90] roughly 80% of the time
    (that's what a well-calibrated 10th/90th percentile band means).
    Too low = interval too narrow (overconfident). Too high = interval
    too wide (uninformative — e.g. always covers everything).
    """
    y_true, _, y_p10, y_p90 = _backtest(bundle, dataset)
    inside = ((y_true >= y_p10) & (y_true <= y_p90)).mean()
    assert MIN_QUANTILE_COVERAGE <= inside <= MAX_QUANTILE_COVERAGE, (
        f"P10-P90 coverage is {inside:.1%}, expected roughly 60-95% for a "
        "usable 80% interval. Check quantile loss / alpha settings used at training time."
    )


def test_feature_columns_present_in_dataset(bundle, dataset):
    feats = bundle["feature_cols"]
    derived_lags = {f"rate_lag_{lag}" for lag in (1, 2, 3, 5, 7, 14)}
    missing = [c for c in feats if c not in dataset.columns and c not in derived_lags]
    assert not missing, f"Model expects features not present in the processed dataset: {missing}"


# --------------------------------------------------------------------------
# Part 2 — API endpoint tests (schema / contract, not accuracy)
# --------------------------------------------------------------------------

def test_health_endpoint(client):
    r = client.get("/api/ml/health")
    assert r.status_code == 200
    body = r.json()
    assert "status" in body and body["status"] == "healthy"
    assert "model_loaded" in body


def test_radar_endpoint_shape(client):
    r = client.get("/api/ml/radar")
    assert r.status_code == 200
    body = r.json()
    for key in ("rate_multiplier", "risk_index", "alerts"):
        assert key in body, f"radar response missing '{key}'"


def test_forecast_endpoint_shape(client):
    payload = {
        "route_id": "TEST-ROUTE-1",
        "base_rate": 15.5,
        "distance_nm": 5200,
        "commodity": "Iron Ore",
    }
    r = client.post("/api/ml/forecast", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert len(body["trajectory_30d"]) == 30
    assert set(body["forecast_horizons"].keys()) == {"7d", "14d", "30d"}
    # p10 should never exceed p90 in any horizon point
    for point in body["trajectory_30d"]:
        assert point["p10_lower"] <= point["p90_upper"], (
            f"Day {point['day']}: p10_lower ({point['p10_lower']}) > "
            f"p90_upper ({point['p90_upper']})"
        )
    assert body["optimal_booking"]["potential_savings_pct"] >= 0.0


def test_forecast_endpoint_rejects_bad_payload(client):
    r = client.post("/api/ml/forecast", json={"route_id": "X"})  # missing required fields
    assert r.status_code == 422


def test_optimize_endpoint_shape(client):
    payload = {
        "destination_port": "gangavaram",
        "distance_nm": 5200,
        "cargo_mt": 160000,
        "predicted_rate": 13.5,
        "bunker_price": 570,
    }
    r = client.post("/api/ml/optimize", json=payload)
    assert r.status_code == 200


def test_simulate_endpoint_math(client):
    payload = {
        "base_rate": 15.0,
        "fuel_price_delta_pct": 10.0,
        "wait_days_delta": 2.0,
        "demand_shock_pct": 0.0,
        "geopolitical_shock": True,
    }
    r = client.post("/api/ml/simulate", json=payload)
    assert r.status_code == 200
    body = r.json()
    breakdown = body["impact_breakdown"]
    total_impact = sum(breakdown.values())
    assert abs(body["delta_pmt"] - total_impact) < 0.01, (
        "impact_breakdown components don't sum to delta_pmt — "
        "simulate() math is inconsistent."
    )
    # sanity: a positive fuel/geopolitical shock with no demand/wait relief
    # should raise the rate, not lower it
    assert body["simulated_rate"] > body["base_rate"]


def test_simulate_endpoint_zero_shock_is_noop(client):
    payload = {"base_rate": 20.0}
    r = client.post("/api/ml/simulate", json=payload)
    body = r.json()
    assert body["simulated_rate"] == pytest.approx(20.0, abs=0.01)
    assert body["change_pct"] == pytest.approx(0.0, abs=0.01)


# --------------------------------------------------------------------------
# Standalone accuracy report (run with: python test_portcast_ml.py --report)
# --------------------------------------------------------------------------

def print_accuracy_report():
    if not os.path.exists(MODEL_PATH):
        print(f"[report] No model bundle found at {MODEL_PATH}. Train it first.")
        sys.exit(1)
    if not os.path.exists(DATA_PATH):
        print(f"[report] No dataset found at {DATA_PATH}.")
        sys.exit(1)

    bundle = joblib.load(MODEL_PATH)
    df = pd.read_csv(DATA_PATH)
    feats = bundle["feature_cols"]
    df = _feature_frame(bundle, df)

    # Walk-forward-ish split: last 20% of rows by original row order act as
    # "future" data, since this is a time-indexed rate series. This is more
    # honest than a random holdout for a forecasting model.
    n = len(df)
    split = int(n * 0.8)
    train_df, test_df = df.iloc[:split], df.iloc[split:]

    X_test = test_df[feats]
    y_true = test_df["target_rate"].values
    y_point = bundle["point_model"].predict(X_test)
    y_p10 = bundle["p10_model"].predict(X_test)
    y_p90 = bundle["p90_model"].predict(X_test)

    mae = mean_absolute_error(y_true, y_point)
    rmse = mean_squared_error(y_true, y_point, squared=False)
    r2 = r2_score(y_true, y_point)
    mape = np.mean(np.abs((y_true - y_point) / np.clip(y_true, 1e-6, None))) * 100
    coverage = ((y_true >= y_p10) & (y_true <= y_p90)).mean() * 100
    avg_band_width = np.mean(y_p90 - y_p10)
    crossings = int((y_p10 > y_p90).sum())

    print("=" * 60)
    print("PortCast ML — Accuracy Report (chronological holdout, last 20%)")
    print("=" * 60)
    print(f"Holdout size:               {len(test_df)} rows (of {n} total)")
    print(f"Point model MAE:            {mae:.2f} $/MT")
    print(f"Point model RMSE:           {rmse:.2f} $/MT")
    print(f"Point model MAPE:           {mape:.1f}%")
    print(f"Point model R^2:            {r2:.3f}")
    print(f"P10-P90 empirical coverage: {coverage:.1f}%  (target: ~80%)")
    print(f"Avg P10-P90 band width:     {avg_band_width:.2f} $/MT")
    print(f"Quantile crossings (bad):   {crossings}")
    if bundle.get("metrics"):
        print("-" * 60)
        print("Metrics recorded at training time:")
        for k, v in bundle["metrics"].items():
            print(f"  {k}: {v}")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PortCast ML test/accuracy tool")
    parser.add_argument("--report", action="store_true", help="Print a standalone accuracy report instead of running pytest")
    args = parser.parse_args()
    if args.report:
        print_accuracy_report()
    else:
        sys.exit(pytest.main([__file__, "-v"]))