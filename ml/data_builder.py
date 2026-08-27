#!/usr/bin/env python3
"""
PortCast — Data Pipeline & Ingestion Engine
Merges historical commodities, port disruptions, live BDRY futures, energy prices,
and generates engineered features for freight rate forecasting.
"""

import os
import json
import urllib.request
import datetime
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
ML_DATA_DIR = os.path.join(BASE_DIR, "ml", "data")
os.makedirs(ML_DATA_DIR, exist_ok=True)

COMMODITY_CSV = os.path.join(BASE_DIR, "commodity_prices_supply_chain.csv")
DISRUPTIONS_CSV = os.path.join(BASE_DIR, "shipping_disruptions.csv")

def fetch_yahoo_history(ticker: str, range_str: str = "5y", interval: str = "1d"):
    """Fetch real-world daily closing prices from Yahoo Finance API."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range={range_str}&interval={interval}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            timestamps = data["chart"]["result"][0]["timestamp"]
            quotes = data["chart"]["result"][0]["indicators"]["quote"][0]
            close_prices = quotes.get("close", [])
            
            records = []
            for ts, close in zip(timestamps, close_prices):
                if close is not None:
                    dt = datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime("%Y-%m-%d")
                    records.append({"date": dt, f"{ticker.lower()}_close": float(close)})
            
            df = pd.DataFrame(records).drop_duplicates(subset=["date"])
            print(f"✅ Fetched {len(df)} daily records for {ticker}")
            return df
    except Exception as e:
        print(f"⚠️ Warning: Could not fetch {ticker} from Yahoo Finance: {e}")
        return pd.DataFrame(columns=["date", f"{ticker.lower()}_close"])

def build_composite_dataset():
    print("\n--- [Step 1] Loading Real Datasets ---")
    # 1. Load Commodity Prices
    print(f"Loading {COMMODITY_CSV}...")
    df_comm = pd.read_csv(COMMODITY_CSV)
    df_comm["date"] = pd.to_datetime(df_comm["date"]).dt.strftime("%Y-%m-%d")
    
    # Pivot key commodities (Brent Crude, Coal, Copper, Aluminum, Iron Ore / Gold)
    key_commodities = ["Brent Crude", "Copper", "Aluminum", "Gold"]
    df_comm_filtered = df_comm[df_comm["commodity"].isin(key_commodities)]
    df_comm_pivot = df_comm_filtered.pivot_table(index="date", columns="commodity", values="price", aggfunc="mean").reset_index()
    df_comm_pivot.columns = ["date"] + [f"comm_{c.lower().replace(' ', '_')}" for c in df_comm_pivot.columns if c != "date"]
    
    # 2. Load Shipping Disruptions
    print(f"Loading {DISRUPTIONS_CSV}...")
    df_disrupt = pd.read_csv(DISRUPTIONS_CSV)
    df_disrupt["date"] = pd.to_datetime(df_disrupt["week"]).dt.strftime("%Y-%m-%d")
    
    # Aggregate weekly disruptions to global and regional metrics
    disrupt_agg = df_disrupt.groupby("date").agg({
        "avg_wait_days": "mean",
        "disruption_index": "mean",
        "fuel_price_usd": "mean",
        "backlog_teu": "mean",
        "on_time_pct": "mean",
        "freight_rate_usd": "mean"
    }).reset_index()
    
    # 3. Fetch Live Market Tickers (BDRY dry bulk ETF, CL=F WTI crude, BNO Brent Oil ETF, SBLK Star Bulk Carriers)
    print("\n--- [Step 2] Fetching Live Maritime & Energy Market Feeds ---")
    df_bdry = fetch_yahoo_history("BDRY", range_str="5y")
    df_crude = fetch_yahoo_history("CL=F", range_str="5y")
    df_sblk = fetch_yahoo_history("SBLK", range_str="5y")
    df_gnk = fetch_yahoo_history("GNK", range_str="5y")

    # 4. Merge all streams into a master daily time-series
    print("\n--- [Step 3] Merging Time-Series Data ---")
    all_dates = pd.date_range(start="2015-01-01", end=datetime.datetime.now().strftime("%Y-%m-%d"), freq="D").strftime("%Y-%m-%d")
    master = pd.DataFrame({"date": all_dates})
    
    master = master.merge(df_comm_pivot, on="date", how="left")
    master = master.merge(disrupt_agg, on="date", how="left")
    if not df_bdry.empty:
        master = master.merge(df_bdry, on="date", how="left")
    if not df_crude.empty:
        master = master.merge(df_crude, on="date", how="left")
    if not df_sblk.empty:
        master = master.merge(df_sblk, on="date", how="left")
    if not df_gnk.empty:
        master = master.merge(df_gnk, on="date", how="left")

    # Forward-fill & backward-fill weekends / holidays
    master = master.ffill().bfill()

    # 5. Feature Engineering
    print("\n--- [Step 4] Feature Engineering (Lags, Ratios, Seasonality) ---")
    master["datetime"] = pd.to_datetime(master["date"])
    master["month"] = master["datetime"].dt.month
    master["quarter"] = master["datetime"].dt.quarter
    master["day_of_year"] = master["datetime"].dt.dayofyear
    
    # Bay of Bengal Monsoon Indicator (June to September = SW Monsoon, Oct-Dec = NE Monsoon Cyclone Season)
    master["is_sw_monsoon"] = master["month"].isin([6, 7, 8, 9]).astype(int)
    master["is_cyclone_season"] = master["month"].isin([10, 11, 12]).astype(int)

    # Rolling Momentum and Volatility on Dry Bulk / Freight Index
    target_col = "bdry_close" if "bdry_close" in master.columns else "freight_rate_usd"
    master["target_rate"] = master[target_col]

    for window in [7, 14, 30]:
        master[f"rate_ma_{window}"] = master["target_rate"].rolling(window=window, min_periods=1).mean()
        master[f"rate_std_{window}"] = master["target_rate"].rolling(window=window, min_periods=1).std().fillna(0)
        master[f"rate_momentum_{window}"] = (master["target_rate"] - master["target_rate"].shift(window)).fillna(0)
        
        if "comm_brent_crude" in master.columns:
            master[f"oil_ma_{window}"] = master["comm_brent_crude"].rolling(window=window, min_periods=1).mean()
        if "avg_wait_days" in master.columns:
            master[f"wait_days_ma_{window}"] = master["avg_wait_days"].rolling(window=window, min_periods=1).mean()

    # Future Targets for Forecasting Horizons (7-day, 14-day, 30-day ahead)
    master["target_lead_7d"] = master["target_rate"].shift(-7)
    master["target_lead_14d"] = master["target_rate"].shift(-14)
    master["target_lead_30d"] = master["target_rate"].shift(-30)

    # Save to disk
    output_path = os.path.join(ML_DATA_DIR, "processed_freight_master.csv")
    master.to_csv(output_path, index=False)
    print(f"🎉 Master dataset generated successfully: {output_path} ({len(master)} rows, {len(master.columns)} features)")
    return output_path

if __name__ == "__main__":
    build_composite_dataset()
