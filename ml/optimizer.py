#!/usr/bin/env python3
"""
PortCast — Vessel Chartering & Cost Optimization Engine
Enforces physical port constraints (draft, LOA, beam, Sandheads lighterage at Haldia),
calculates voyage economics (fuel burn, sea days, demurrage), and optimizes charter timing.
"""

from typing import Dict, List, Any, Optional

# Master Fleet Data
VESSEL_CLASSES = [
    {
        "type": "Handysize",
        "dwtMin": 25000,
        "dwtMax": 40000,
        "typicalDWT": 35000,
        "maxDraft": 10.5,
        "loa": 180,
        "beam": 28,
        "dailyFuelSea": 18,    # MT/day VLSFO at sea
        "dailyFuelPort": 2.5,  # MT/day MGO in port
        "speedKnots": 13.0,
        "dailyCharterRate": 11500, # Base daily hire ($/day)
        "dailyDemurrage": 12000
    },
    {
        "type": "Supramax",
        "dwtMin": 40000,
        "dwtMax": 65000,
        "typicalDWT": 58000,
        "maxDraft": 12.8,
        "loa": 200,
        "beam": 32.2,
        "dailyFuelSea": 25,
        "dailyFuelPort": 3.0,
        "speedKnots": 13.5,
        "dailyCharterRate": 14500,
        "dailyDemurrage": 15000
    },
    {
        "type": "Panamax",
        "dwtMin": 65000,
        "dwtMax": 85000,
        "typicalDWT": 76000,
        "maxDraft": 14.5,
        "loa": 225,
        "beam": 32.3,
        "dailyFuelSea": 31,
        "dailyFuelPort": 3.5,
        "speedKnots": 14.0,
        "dailyCharterRate": 17500,
        "dailyDemurrage": 18000
    },
    {
        "type": "Capesize",
        "dwtMin": 100000,
        "dwtMax": 200000,
        "typicalDWT": 180000,
        "maxDraft": 18.5,
        "loa": 290,
        "beam": 45,
        "dailyFuelSea": 52,
        "dailyFuelPort": 4.5,
        "speedKnots": 14.5,
        "dailyCharterRate": 26000,
        "dailyDemurrage": 28000
    }
]

# Destination Ports & Physical Limits
DESTINATION_PORTS = {
    "paradip": {
        "name": "Paradip",
        "maxDraft": 14.5,
        "maxLOA": 260,
        "avgWaitingDays": 2.5,
        "dischargeRateMTPerDay": 25000,
        "portDuesPerMT": 0.45,
        "lighterageRequired": False,
        "lighterageCostPerMT": 0.0
    },
    "vizag": {
        "name": "Visakhapatnam (Vizag)",
        "maxDraft": 18.1,
        "maxLOA": 330,
        "avgWaitingDays": 2.0,
        "dischargeRateMTPerDay": 30000,
        "portDuesPerMT": 0.50,
        "lighterageRequired": False,
        "lighterageCostPerMT": 0.0
    },
    "haldia": {
        "name": "Haldia (Kolkata)",
        "maxDraft": 8.5,
        "maxLOA": 185,
        "avgWaitingDays": 4.5,
        "dischargeRateMTPerDay": 12000,
        "portDuesPerMT": 0.65,
        "lighterageRequired": True, # Shallow river port: Sandheads anchorage lighterage
        "lighterageCostPerMT": 5.25
    },
    "dhamra": {
        "name": "Dhamra",
        "maxDraft": 18.0,
        "maxLOA": 320,
        "avgWaitingDays": 1.5,
        "dischargeRateMTPerDay": 35000,
        "portDuesPerMT": 0.40,
        "lighterageRequired": False,
        "lighterageCostPerMT": 0.0
    },
    "ennore": {
        "name": "Kamarajar (Ennore)",
        "maxDraft": 15.5,
        "maxLOA": 270,
        "avgWaitingDays": 1.8,
        "dischargeRateMTPerDay": 28000,
        "portDuesPerMT": 0.42,
        "lighterageRequired": False,
        "lighterageCostPerMT": 0.0
    }
}

def evaluate_voyage(
    vessel: Dict[str, Any],
    port: Dict[str, Any],
    distance_nm: float,
    cargo_mt: float,
    predicted_rate_pmt: float,
    vlsfo_price_pmt: float = 620.0,
    mgo_price_pmt: float = 880.0
) -> Dict[str, Any]:
    """Calculate detailed voyage economics and constraint feasibility for a vessel class."""
    
    # 1. Draft Feasibility Check
    draft_exceeded = vessel["maxDraft"] > port["maxDraft"]
    is_feasible = True
    lighterage_cost = 0.0
    feasibility_notes = "Fully feasible"

    if draft_exceeded:
        if port.get("lighterageRequired", False):
            # E.g. Haldia allows partial Sandheads lighterage offload
            is_feasible = True
            lighterage_cost = cargo_mt * port["lighterageCostPerMT"]
            feasibility_notes = f"Requires Sandheads lighterage (+${port['lighterageCostPerMT']:.2f}/MT)"
        else:
            is_feasible = False
            feasibility_notes = f"Exceeds port draft limit ({vessel['maxDraft']}m > {port['maxDraft']}m)"

    # 2. Voyage Duration (Sea Days + Port Days)
    sea_days = distance_nm / (vessel["speedKnots"] * 24.0)
    discharge_days = cargo_mt / max(port["dischargeRateMTPerDay"], 1000)
    total_port_days = discharge_days + port["avgWaitingDays"]
    total_voyage_days = sea_days + total_port_days

    # 3. Capacity Utilization
    effective_cargo = min(cargo_mt, vessel["typicalDWT"])
    capacity_utilization = min(100.0, (cargo_mt / vessel["typicalDWT"]) * 100.0)

    # 4. Total Cost Calculation
    freight_cost = cargo_mt * predicted_rate_pmt
    bunker_sea_cost = sea_days * vessel["dailyFuelSea"] * vlsfo_price_pmt
    bunker_port_cost = total_port_days * vessel["dailyFuelPort"] * mgo_price_pmt
    total_bunker_cost = bunker_sea_cost + bunker_port_cost
    port_dues = cargo_mt * port["portDuesPerMT"]
    waiting_demurrage = port["avgWaitingDays"] * vessel["dailyDemurrage"]
    
    total_cost = freight_cost + total_bunker_cost + port_dues + waiting_demurrage + lighterage_cost
    effective_cost_per_mt = total_cost / cargo_mt if cargo_mt > 0 else 0

    return {
        "vessel_type": vessel["type"],
        "is_feasible": is_feasible,
        "feasibility_notes": feasibility_notes,
        "capacity_utilization_pct": round(capacity_utilization, 1),
        "sea_days": round(sea_days, 1),
        "port_days": round(total_port_days, 1),
        "total_days": round(total_voyage_days, 1),
        "cost_breakdown": {
            "freight_cost_usd": round(freight_cost, 2),
            "bunker_cost_usd": round(total_bunker_cost, 2),
            "port_dues_usd": round(port_dues, 2),
            "demurrage_usd": round(waiting_demurrage, 2),
            "lighterage_cost_usd": round(lighterage_cost, 2),
            "total_voyage_cost_usd": round(total_cost, 2)
        },
        "cost_per_mt_usd": round(effective_cost_per_mt, 2)
    }

def optimize_charter(
    destination_port_id: str,
    distance_nm: float,
    cargo_mt: float,
    predicted_rate_pmt: float,
    vlsfo_price: float = 620.0
) -> Dict[str, Any]:
    """Rank all vessel classes by effective cost and capacity fit."""
    port_info = DESTINATION_PORTS.get(destination_port_id.lower(), DESTINATION_PORTS["vizag"])
    
    evaluations = []
    for vessel in VESSEL_CLASSES:
        eval_res = evaluate_voyage(
            vessel=vessel,
            port=port_info,
            distance_nm=distance_nm,
            cargo_mt=cargo_mt,
            predicted_rate_pmt=predicted_rate_pmt,
            vlsfo_price_pmt=vlsfo_price
        )
        evaluations.append(eval_res)

    # Filter feasible vessels and sort by total voyage cost
    feasible_vessels = [v for v in evaluations if v["is_feasible"]]
    feasible_vessels.sort(key=lambda x: x["cost_per_mt_usd"])

    best_recommendation = feasible_vessels[0] if feasible_vessels else evaluations[0]
    
    # Calculate savings vs least optimal feasible vessel
    savings_usd = 0.0
    if len(feasible_vessels) > 1:
        worst_cost = feasible_vessels[-1]["cost_breakdown"]["total_voyage_cost_usd"]
        best_cost = best_recommendation["cost_breakdown"]["total_voyage_cost_usd"]
        savings_usd = max(0.0, worst_cost - best_cost)

    return {
        "status": "success",
        "destination_port": port_info["name"],
        "cargo_mt": cargo_mt,
        "recommended_vessel": best_recommendation["vessel_type"],
        "recommended_cost_per_mt": best_recommendation["cost_per_mt_usd"],
        "total_estimated_cost_usd": best_recommendation["cost_breakdown"]["total_voyage_cost_usd"],
        "potential_savings_usd": round(savings_usd, 2),
        "vessel_comparison": evaluations
    }

if __name__ == "__main__":
    res = optimize_charter("vizag", distance_nm=4800, cargo_mt=75000, predicted_rate_pmt=18.50)
    print("\n--- Vessel Chartering Optimizer Result ---")
    print(f"Recommended: {res['recommended_vessel']} at ${res['recommended_cost_per_mt']}/MT")
    print(f"Total Cost: ${res['total_estimated_cost_usd']:,.2f} | Savings: ${res['potential_savings_usd']:,.2f}")
