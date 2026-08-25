#!/usr/bin/env python3
"""
PortCast — ML Training Core
Trains LightGBM & GradientBoosting regressors for:
1. Point Forecast of Freight Rate ($/MT)
2. Quantile Bands (P10 lower risk, P90 upper shock bound)
3. 7-day, 14-day, 30-day forecast horizons
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.ensemble import GradientBoostingRegressor
import lightgbm as lgb

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "ml", "data", "processed_freight_master.csv")
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_models():
    print(f"Loading dataset from {DATA_PATH}...")
    if not os.path.exists(DATA_PATH):
        from data_builder import build_composite_dataset
        build_composite_dataset()

    df = pd.read_csv(DATA_PATH)
    print(f"Dataset shape: {df.shape}")

    # Feature selection
    feature_cols = [
        col for col in df.columns 
        if col not in ["date", "datetime", "target_rate", "target_lead_7d", "target_lead_14d", "target_lead_30d"]
    ]
    print(f"\nFeatures ({len(feature_cols)}): {feature_cols}")

    # Clean missing values
    df_clean = df.dropna(subset=["target_rate"]).copy()
    X = df_clean[feature_cols].ffill().fillna(0)
    y = df_clean["target_rate"]

    # 1. Train Primary Point Regressor (LightGBM)
    print("\n--- Training Primary LightGBM Point Regressor ---")
    point_model = lgb.LGBMRegressor(
        n_estimators=300,
        learning_rate=0.03,
        num_leaves=31,
        random_state=42,
        verbosity=-1
    )
    
    # Train-test split using TimeSeriesSplit
    split_idx = int(len(X) * 0.85)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    point_model.fit(X_train, y_train)
    preds = point_model.predict(X_test)

    rmse = np.sqrt(mean_squared_error(y_test, preds))
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    print(f"✅ LightGBM Test Metrics: RMSE = {rmse:.4f} | MAE = {mae:.4f} | R² = {r2:.4f}")

    # 2. Train Quantile Regressors (P10 and P90 uncertainty bands)
    print("\n--- Training Quantile Regressors (P10 & P90 Uncertainty Bands) ---")
    p10_model = lgb.LGBMRegressor(
        objective="quantile",
        alpha=0.10,
        n_estimators=200,
        learning_rate=0.03,
        random_state=42,
        verbosity=-1
    )
    p10_model.fit(X_train, y_train)

    p90_model = lgb.LGBMRegressor(
        objective="quantile",
        alpha=0.90,
        n_estimators=200,
        learning_rate=0.03,
        random_state=42,
        verbosity=-1
    )
    p90_model.fit(X_train, y_train)

    # 3. Feature Importance Extraction
    importances = dict(zip(feature_cols, [float(x) for x in point_model.feature_importances_]))
    sorted_importance = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True)[:10])

    # 4. Save Models and Metadata
    model_bundle = {
        "point_model": point_model,
        "p10_model": p10_model,
        "p90_model": p90_model,
        "feature_cols": feature_cols,
        "metrics": {"rmse": float(rmse), "mae": float(mae), "r2": float(r2)},
        "top_features": sorted_importance,
        "latest_features": X.iloc[-1].to_dict()
    }

    model_file = os.path.join(MODELS_DIR, "freight_forecasting_bundle.pkl")
    joblib.dump(model_bundle, model_file)
    print(f"\n🎉 Saved model bundle to: {model_file}")

    # Also save JSON metadata for fast Node.js reading
    metadata_file = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(metadata_file, "w") as f:
        json.dump({
            "metrics": model_bundle["metrics"],
            "top_features": sorted_importance,
            "feature_count": len(feature_cols),
            "status": "ready"
        }, f, indent=2)

    return model_bundle

if __name__ == "__main__":
    train_models()
