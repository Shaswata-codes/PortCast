// =====================================================
// PortCast — Optimizer Engine
// Vessel selection, voyage cost calculator, idle/demurrage manager
// =====================================================

import { vesselClasses } from '../data/vesselsData.js';
import { destinationPorts } from '../data/portsData.js';

/**
 * Evaluate all vessel classes for a given route and cargo parcel
 * Returns ranked recommendations with full cost breakdown
 */
export function optimizeVessel(route, destPort, parcelSizeMT, bunkerPriceVLSFO = 620) {
  const results = [];

  for (const vessel of vesselClasses) {
    const evaluation = evaluateVessel(vessel, route, destPort, parcelSizeMT, bunkerPriceVLSFO);
    results.push(evaluation);
  }

  // Sort by total cost per MT (ascending)
  results.sort((a, b) => {
    if (a.feasible && !b.feasible) return -1;
    if (!a.feasible && b.feasible) return 1;
    return (a.totalCostPerMT || Infinity) - (b.totalCostPerMT || Infinity);
  });

  // Mark optimal
  const feasible = results.filter(r => r.feasible);
  if (feasible.length > 0) {
    feasible[0].isOptimal = true;
  }

  return {
    routeId: route.id,
    routeName: `${route.originName} → ${route.destinationName}`,
    parcelSizeMT,
    bunkerPriceVLSFO,
    recommendations: results,
    optimalVessel: feasible.length > 0 ? feasible[0] : null,
    totalOptionsEvaluated: results.length,
    feasibleOptions: feasible.length,
  };
}

function evaluateVessel(vessel, route, destPort, parcelSizeMT, bunkerPrice) {
  const result = {
    vesselClass: vessel.name,
    vesselId: vessel.id,
    color: vessel.color,
    feasible: true,
    isOptimal: false,
    constraints: [],
    warnings: [],
  };

  // ---- CONSTRAINT CHECKS ----

  // 1. Draft check
  if (vessel.ladenDraftMax > destPort.maxDraft) {
    if (destPort.lighterageRequired) {
      result.warnings.push(`Exceeds port draft (${vessel.ladenDraftMax}m > ${destPort.maxDraft}m). Lighterage required at $${destPort.lighterageCostPerMT}/MT.`);
      result.lighterageCost = destPort.lighterageCostPerMT * parcelSizeMT;
      result.lighterageCostPerMT = destPort.lighterageCostPerMT;
    } else {
      result.feasible = false;
      result.constraints.push(`Draft ${vessel.ladenDraftMax}m exceeds port max ${destPort.maxDraft}m. No lighterage option available.`);
    }
  }

  // 2. LOA check
  if (vessel.typicalLOA > destPort.maxLOA) {
    result.feasible = false;
    result.constraints.push(`LOA ${vessel.typicalLOA}m exceeds port max ${destPort.maxLOA}m.`);
  }

  // 3. Beam check
  if (vessel.beam > destPort.maxBeam) {
    result.feasible = false;
    result.constraints.push(`Beam ${vessel.beam}m exceeds port max ${destPort.maxBeam}m.`);
  }

  // 4. Cargo capacity check
  const trips = Math.ceil(parcelSizeMT / vessel.cargoCapacityMax);
  if (parcelSizeMT > vessel.cargoCapacityMax) {
    if (trips > 3) {
      result.warnings.push(`Requires ${trips} voyages to transport ${parcelSizeMT.toLocaleString()} MT. Consider larger vessel class.`);
    }
  }
  result.tripsRequired = trips;
  const effectiveCargo = Math.min(parcelSizeMT, vessel.cargoCapacityMax);

  if (!result.feasible) {
    result.totalCostPerMT = null;
    return result;
  }

  // ---- VOYAGE COST CALCULATION ----

  // Transit costs
  const transitDays = route.transitDaysLaden;
  const ballastDays = route.transitDaysBallast;
  const totalSeaDays = transitDays + ballastDays;

  // Port days (loading + discharge)
  const loadingDays = Math.ceil(effectiveCargo / 35000); // avg loading rate
  const dischargeDays = Math.ceil(effectiveCargo / destPort.avgDischargeRate);
  const waitingDays = destPort.avgWaitingDays;
  const totalPortDays = loadingDays + dischargeDays + waitingDays;

  const totalVoyageDays = totalSeaDays + totalPortDays;

  // Hire cost
  const dailyHire = vessel.avgDailyHire;
  const totalHireCost = dailyHire * totalVoyageDays;

  // Fuel cost (sea days only at full consumption, port at 15%)
  const seaFuelCost = totalSeaDays * vessel.fuelConsumptionPerDay * bunkerPrice;
  const portFuelCost = totalPortDays * vessel.fuelConsumptionPerDay * 0.15 * bunkerPrice;
  const totalFuelCost = seaFuelCost + portFuelCost;

  // Port dues and fees
  const portDues = (destPort.portDues || 0.45) * effectiveCargo;
  const pilotage = (destPort.pilotage || 0.30) * effectiveCargo;
  const totalPortCharges = portDues + pilotage;

  // Lighterage cost
  const lighterageCost = result.lighterageCost || 0;

  // Total voyage cost
  const totalVoyageCost = totalHireCost + totalFuelCost + totalPortCharges + lighterageCost;
  const costPerMT = totalVoyageCost / effectiveCargo;

  // Daily time-charter equivalent
  const tcEquivalent = (totalVoyageCost - totalFuelCost) / totalVoyageDays;

  // Utilization
  const utilization = (effectiveCargo / vessel.cargoCapacityMax) * 100;

  Object.assign(result, {
    effectiveCargo,
    totalVoyageDays,
    breakdown: {
      transitDays,
      ballastDays,
      loadingDays,
      dischargeDays,
      waitingDays,
    },
    costs: {
      hireCost: Math.round(totalHireCost),
      fuelCost: Math.round(totalFuelCost),
      portCharges: Math.round(totalPortCharges),
      lighterageCost: Math.round(lighterageCost),
      totalVoyageCost: Math.round(totalVoyageCost),
    },
    totalCostPerMT: Math.round(costPerMT * 100) / 100,
    lighterageCostPerMT: result.lighterageCostPerMT || 0,
    dailyTCEquivalent: Math.round(tcEquivalent),
    utilization: Math.round(utilization * 10) / 10,
    dailyHire,
    tripsRequired: trips,
  });

  return result;
}

/**
 * Idle & Demurrage Risk Assessment
 */
export function assessIdleRisk(destPort, route, parcelSizeMT) {
  const waitingDays = destPort.avgWaitingDays;
  const currentMonth = new Date().getMonth();

  // Monsoon congestion amplifier
  let congestionMultiplier = 1.0;
  if (currentMonth >= 5 && currentMonth <= 8) {
    congestionMultiplier = 1.5; // SW Monsoon — 50% more waiting
  } else if (currentMonth >= 3 && currentMonth <= 4) {
    congestionMultiplier = 1.3; // Pre-monsoon stock build
  }

  const estimatedWait = Math.round(waitingDays * congestionMultiplier * 10) / 10;
  const demurrageRate = 18000; // $/day typical
  const despatchRate = 9000; // $/day (half demurrage)

  // Laycan window recommendation
  const laycStartDays = route.transitDaysLaden + 2; // buffer
  const laycEndDays = laycStartDays + 5; // 5-day laycan window

  // Discharge time estimate
  const dischargeDays = Math.ceil(parcelSizeMT / destPort.avgDischargeRate);
  const allowedLaytime = dischargeDays + 1; // 1 day buffer

  // Risk score (0-100)
  const riskScore = Math.min(100, Math.round(
    (estimatedWait / 5) * 30 + // waiting component
    (congestionMultiplier - 1) * 40 + // seasonal component
    (destPort.lighterageRequired ? 20 : 0) + // lighterage penalty
    (dischargeDays > 5 ? 10 : 0) // slow discharge penalty
  ));

  return {
    portId: destPort.id,
    portName: destPort.name,
    estimatedWaitingDays: estimatedWait,
    congestionMultiplier,
    seasonalNote: congestionMultiplier > 1.2 ? 'Monsoon season — expect higher congestion' : 'Normal season',
    demurrage: {
      ratePerDay: demurrageRate,
      estimatedLiability: Math.round(demurrageRate * Math.max(0, estimatedWait - 1)),
      allowedLaytime,
      dischargeDays,
    },
    despatch: {
      ratePerDay: despatchRate,
      potentialEarnings: dischargeDays < allowedLaytime ? Math.round(despatchRate * (allowedLaytime - dischargeDays)) : 0,
    },
    laycanRecommendation: {
      startDay: laycStartDays,
      endDay: laycEndDays,
      windowDays: 5,
      note: `Set laycan ${laycStartDays}–${laycEndDays} days from fixture date. This provides adequate transit buffer.`,
    },
    riskScore,
    riskLevel: riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW',
    mitigationStrategies: [
      estimatedWait > 3 ? 'Consider nearby alternative port (e.g., Dhamra vs Paradip) with lower congestion' : null,
      congestionMultiplier > 1.2 ? 'Schedule arrival outside peak monsoon months if possible' : null,
      destPort.lighterageRequired ? 'Account for lighterage costs and time in total voyage economics' : null,
      'Negotiate wider laycan window (+2 days) to absorb port delays',
      'Consider speed optimization (slow steaming) to align arrival with berth availability',
    ].filter(Boolean),
  };
}
