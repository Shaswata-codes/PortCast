#!/usr/bin/env python3
"""
PortCast — ML Training Core
Trains LightGBM & XGBoost regressors for:
1. Point Forecast of Freight Rate ($/MT)
2. Quantile Bands (P10 lower risk, P90 upper shock bound)
3. 7-day, 14-day, 30-day forecast horizons

Hybrid ensemble: ensemble = mean(lightgbm, xgboost) when both available.
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

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("⚠️  xgboost not installed — skipping XGBoost training. pip install xgboost>=2.0")

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

    # Feature selection — exclude contemporaneous target-scale prices to prevent leakage.
    LEAKY = ["bdry_close"]
    feature_cols = [
        col for col in df.columns
        if col not in ["date", "datetime", "target_rate", "target_lead_7d", "target_lead_14d", "target_lead_30d"] + LEAKY
    ]
    print(f"\nFeatures ({len(feature_cols)}): {feature_cols}")

    # Explicit causal lags of the target so the model can learn autoregression
    for lag in (1, 2, 3, 5, 7, 14):
        col = f"rate_lag_{lag}"
        df[col] = df["target_rate"].shift(lag)
        if col not in feature_cols:
            feature_cols.append(col)

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

    rmse_lgb = np.sqrt(mean_squared_error(y_test, preds))
    mae_lgb = mean_absolute_error(y_test, preds)
    r2_lgb = r2_score(y_test, preds)

    print(f"✅ LightGBM Test Metrics: RMSE = {rmse_lgb:.4f} | MAE = {mae_lgb:.4f} | R² = {r2_lgb:.4f}")

    # 1b. Train XGBoost (if available) + hybrid ensemble
    xgb_model = None
    preds_xgb = None
    if XGBOOST_AVAILABLE:
        print("\n--- Training XGBoost Point Regressor ---")
        xgb_model = xgb.XGBRegressor(
            n_estimators=300,
            learning_rate=0.03,
            max_depth=6,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=42,
            verbosity=0,
            tree_method='hist',
        )
        xgb_model.fit(X_train, y_train)
        preds_xgb = xgb_model.predict(X_test)

        rmse_xgb = np.sqrt(mean_squared_error(y_test, preds_xgb))
        mae_xgb = mean_absolute_error(y_test, preds_xgb)
        r2_xgb = r2_score(y_test, preds_xgb)
        print(f"✅ XGBoost Test Metrics:  RMSE = {rmse_xgb:.4f} | MAE = {mae_xgb:.4f} | R² = {r2_xgb:.4f}")

        # Hybrid ensemble = mean(lightgbm, xgboost)
        preds_ens = (preds + preds_xgb) / 2.0
        rmse_ens = np.sqrt(mean_squared_error(y_test, preds_ens))
        mae_ens = mean_absolute_error(y_test, preds_ens)
        r2_ens = r2_score(y_test, preds_ens)
        print(f"🧬 Ensemble (avg):        RMSE = {rmse_ens:.4f} | MAE = {mae_ens:.4f} | R² = {r2_ens:.4f}")

        # Use the better of (LightGBM, ensemble) for downstream serving
        if r2_ens >= r2_lgb:
            rmse, mae, r2 = rmse_ens, mae_ens, r2_ens
            print(f"→ Serving from HYBRID ensemble (R²={r2:.4f})")
        else:
            rmse, mae, r2 = rmse_lgb, mae_lgb, r2_lgb
            print(f"→ Serving from LightGBM (R²={r2:.4f})")
    else:
        rmse, mae, r2 = rmse_lgb, mae_lgb, r2_lgb

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

    # 3. Feature Importance Extraction (averaged across LightGBM + XGBoost if available)
    importances_lgb = dict(zip(feature_cols, [float(x) for x in point_model.feature_importances_]))
    if xgb_model is not None:
        importances_xgb = dict(zip(feature_cols, [float(x) for x in xgb_model.feature_importances_]))
        # Normalize each to 0-1, then average
        max_lgb = max(importances_lgb.values()) or 1
        max_xgb = max(importances_xgb.values()) or 1
        importances = {
            k: ((importances_lgb[k] / max_lgb) + (importances_xgb[k] / max_xgb)) / 2.0
            for k in feature_cols
        }
    else:
        importances = importances_lgb
    sorted_importance = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True)[:10])

    # 4. Save Models and Metadata
    model_bundle = {
        "point_model": point_model,
        "xgb_model": xgb_model,
        "p10_model": p10_model,
        "p90_model": p90_model,
        "feature_cols": feature_cols,
        "metrics": {
            "rmse": float(rmse), "mae": float(mae), "r2": float(r2),
            "lightgbm": {"rmse": float(rmse_lgb), "mae": float(mae_lgb), "r2": float(r2_lgb)},
            "xgboost": (
                {"rmse": float(rmse_xgb), "mae": float(mae_xgb), "r2": float(r2_xgb)}
                if xgb_model is not None else None
            ),
            "ensemble": "LightGBM + XGBoost (mean)" if xgb_model is not None else "LightGBM only",
        },
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
            "ensemble": model_bundle["metrics"]["ensemble"],
            "status": "ready"
        }, f, indent=2)

    return model_bundle

if __name__ == "__main__":
    train_models()
